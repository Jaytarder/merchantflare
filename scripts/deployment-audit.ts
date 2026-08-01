import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";

const required = [
  "DATABASE_URL",
  "COGNITO_BOOTSTRAP_SUBJECT",
  "TARGET_OWNER_EMAIL",
] as const;

function configuration() {
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing required variables: ${missing.join(", ")}`);
  }
  return Object.fromEntries(
    required.map((name) => [name, process.env[name]!.trim()]),
  ) as Record<(typeof required)[number], string>;
}

async function expectedMigrations() {
  const directory = resolve(process.cwd(), "db", "migrations");
  const names = (await readdir(directory))
    .filter((name) => /^\d{3}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
  return Promise.all(names.map(async (name) => {
    const sql = (await readFile(resolve(directory, name), "utf8"))
      .replace(/\r\n?/g, "\n");
    return {
      name,
      checksum: createHash("sha256").update(sql).digest("hex"),
    };
  }));
}

async function main() {
  const config = configuration();
  const expected = await expectedMigrations();
  const sql = postgres(config.DATABASE_URL, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 20,
    ssl: "require",
  });

  try {
    const applied = await sql<Array<{ name: string; checksum: string }>>`
      select name, checksum
      from merchantflare_schema_migrations
      order by name
    `;
    if (
      applied.length !== expected.length ||
      expected.some((migration, index) =>
        applied[index]?.name !== migration.name ||
        applied[index]?.checksum !== migration.checksum)
    ) {
      throw new Error("Database migration names or checksums do not match the repository.");
    }

    const owner = await sql<Array<{
      organization_id: string;
      organization_status: string;
      membership_status: string;
      role: string;
    }>>`
      select
        organization.id as organization_id,
        organization.status as organization_status,
        membership.status as membership_status,
        membership.role
      from platform_users user_account
      join platform_organization_memberships membership
        on membership.user_id = user_account.id
      join platform_organizations organization
        on organization.id = membership.organization_id
      where user_account.identity_provider = 'cognito'
        and user_account.identity_subject = ${config.COGNITO_BOOTSTRAP_SUBJECT}
        and lower(user_account.email) = ${config.TARGET_OWNER_EMAIL.toLowerCase()}
    `;
    if (
      owner.length !== 1 ||
      owner[0].organization_status !== "active" ||
      owner[0].membership_status !== "active" ||
      owner[0].role !== "owner"
    ) {
      throw new Error("The verified Cognito identity does not resolve to one active Owner membership.");
    }

    const integrity = await sql<Array<{ orphan_count: number }>>`
      select (
        (select count(*) from mercury_conversations conversation
          where not exists (
            select 1 from platform_organizations organization
            where organization.id = conversation.organization_id
          )) +
        (select count(*) from mercury_plans plan
          where not exists (
            select 1 from platform_organizations organization
            where organization.id = plan.organization_id
          )) +
        (select count(*) from mercury_evidence_items evidence
          where not exists (
            select 1 from platform_organizations organization
            where organization.id = evidence.organization_id
          )) +
        (select count(*) from mercury_approvals approval
          where not exists (
            select 1 from platform_organizations organization
            where organization.id = approval.organization_id
          ))
      )::integer as orphan_count
    `;
    if (integrity[0]?.orphan_count !== 0) {
      throw new Error("Organization isolation audit found orphaned tenant records.");
    }

    const dataState = await sql<Array<{ has_existing_data: boolean }>>`
      select exists (
        select 1 from platform_users
        union all select 1 from mercury_conversations
        union all select 1 from mercury_plans
        union all select 1 from mercury_evidence_items
      ) as has_existing_data
    `;

    console.log(JSON.stringify({
      databaseReachable: true,
      migrations: expected.map((migration) => migration.name),
      checksumsVerified: true,
      organizationIsolationVerified: true,
      ownerMembershipVerified: true,
      ownerOrganizationId: owner[0].organization_id,
      hasExistingData: dataState[0]?.has_existing_data ?? false,
    }));
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Deployment audit failed.");
  process.exitCode = 1;
});