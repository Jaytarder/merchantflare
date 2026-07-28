import { createHash } from "node:crypto";
import postgres from "postgres";

const required = [
  "DATABASE_URL",
  "COGNITO_BOOTSTRAP_SUBJECT",
  "COGNITO_BOOTSTRAP_EMAIL",
  "COGNITO_BOOTSTRAP_ORGANIZATION_ID",
  "COGNITO_BOOTSTRAP_ORGANIZATION_NAME",
  "COGNITO_BOOTSTRAP_ORGANIZATION_SLUG",
] as const;

function configuration() {
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length) throw new Error(`Missing required variables: ${missing.join(", ")}`);
  return Object.fromEntries(
    required.map((name) => [name, process.env[name]!.trim()]),
  ) as Record<(typeof required)[number], string>;
}

async function main() {
  const config = configuration();
  const sql = postgres(config.DATABASE_URL, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 20,
    ssl: process.env.NODE_ENV === "production" ? "require" : undefined,
  });
  const userId = `user_cognito_${createHash("sha256")
    .update(config.COGNITO_BOOTSTRAP_SUBJECT)
    .digest("hex")
    .slice(0, 24)}`;

  try {
    await sql.begin(async (transaction) => {
      await transaction`select pg_advisory_xact_lock(hashtext('merchantflare_cognito_owner_bootstrap'))`;
      const existing = await transaction<Array<{ identity_subject: string }>>`
        select user_account.identity_subject
        from platform_organization_memberships membership
        join platform_users user_account on user_account.id = membership.user_id
        where membership.organization_id = ${config.COGNITO_BOOTSTRAP_ORGANIZATION_ID}
          and membership.role = 'owner'
          and membership.status = 'active'
          and user_account.identity_provider = 'cognito'
      `;
      if (
        existing.length > 0 &&
        !existing.some((row) => row.identity_subject === config.COGNITO_BOOTSTRAP_SUBJECT)
      ) {
        throw new Error("This organization already has a different active Cognito Owner.");
      }
      const matchingUsers = await transaction<Array<{
        id: string;
        identity_provider: string;
        identity_subject: string;
      }>>`
        select id, identity_provider, identity_subject
        from platform_users
        where (
          identity_provider = 'cognito'
          and identity_subject = ${config.COGNITO_BOOTSTRAP_SUBJECT}
        ) or lower(email) = ${config.COGNITO_BOOTSTRAP_EMAIL.toLowerCase()}
        for update
      `;
      const distinctUsers = new Set(matchingUsers.map((user) => user.id));
      if (distinctUsers.size > 1) {
        throw new Error("The Cognito subject and email resolve to different application users.");
      }
      const existingUser = matchingUsers[0];
      if (
        existingUser?.identity_provider === "cognito" &&
        existingUser.identity_subject !== config.COGNITO_BOOTSTRAP_SUBJECT
      ) {
        throw new Error("The bootstrap email is already bound to another Cognito subject.");
      }
      const resolvedUserId = existingUser?.id ?? userId;

      await transaction`
        insert into platform_organizations (id, slug, name, status, created_by)
        values (
          ${config.COGNITO_BOOTSTRAP_ORGANIZATION_ID},
          ${config.COGNITO_BOOTSTRAP_ORGANIZATION_SLUG},
          ${config.COGNITO_BOOTSTRAP_ORGANIZATION_NAME},
          'active',
          ${resolvedUserId}
        )
        on conflict (id) do update set
          name = excluded.name,
          updated_at = now()
      `;
      await transaction`
        insert into platform_organization_settings (organization_id)
        values (${config.COGNITO_BOOTSTRAP_ORGANIZATION_ID})
        on conflict (organization_id) do nothing
      `;
      await transaction`
        insert into platform_users (id, email, display_name, identity_provider, identity_subject)
        values (
          ${resolvedUserId}, ${config.COGNITO_BOOTSTRAP_EMAIL.toLowerCase()},
          ${config.COGNITO_BOOTSTRAP_EMAIL.split("@")[0]},
          'cognito', ${config.COGNITO_BOOTSTRAP_SUBJECT}
        )
        on conflict (id) do update set
          email = excluded.email,
          identity_provider = 'cognito',
          identity_subject = excluded.identity_subject,
          updated_at = now()
      `;
      await transaction`
        insert into platform_organization_memberships (
          organization_id, user_id, role, status
        )
        values (
          ${config.COGNITO_BOOTSTRAP_ORGANIZATION_ID},
          ${resolvedUserId},
          'owner',
          'active'
        )
        on conflict (organization_id, user_id) do update set
          role = 'owner',
          status = 'active',
          updated_at = now()
      `;
    });
    console.log(
      `Bootstrapped Cognito subject ${config.COGNITO_BOOTSTRAP_SUBJECT} as Owner of ${config.COGNITO_BOOTSTRAP_ORGANIZATION_ID}.`,
    );
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Owner bootstrap failed.");
  process.exitCode = 1;
});
