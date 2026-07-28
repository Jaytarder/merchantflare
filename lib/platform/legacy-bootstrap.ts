import { createHash } from "node:crypto";
import type postgres from "postgres";
import type { AuthenticatedPrincipal } from "./identity";

function legacyOrganizationSlug(organizationId: string) {
  return `legacy-${createHash("sha256")
    .update(organizationId)
    .digest("hex")
    .slice(0, 12)}`;
}

export async function ensureLegacyPrincipalProvisioned(
  sql: postgres.Sql,
  principal: AuthenticatedPrincipal,
) {
  if (principal.authenticationMethod !== "legacy-cookie") return;

  await sql.begin(async (tx) => {
    await tx`
      insert into platform_organizations (
        id, slug, name, status, created_by
      ) values (
        ${principal.organizationId},
        ${legacyOrganizationSlug(principal.organizationId)},
        'MerchantFlare',
        'active',
        ${principal.subjectId}
      )
      on conflict (id) do nothing
    `;
    await tx`
      insert into platform_users (
        id,
        email,
        display_name,
        identity_provider,
        identity_subject
      ) values (
        ${principal.subjectId},
        ${principal.email.toLowerCase()},
        ${principal.email.split("@")[0]},
        'legacy-cookie',
        ${principal.subjectId}
      )
      on conflict (id) do update set
        email = excluded.email,
        updated_at = now()
    `;
    await tx`
      insert into platform_organization_memberships (
        organization_id,
        user_id,
        role,
        status
      ) values (
        ${principal.organizationId},
        ${principal.subjectId},
        'owner',
        'active'
      )
      on conflict (organization_id, user_id) do update set
        role = 'owner',
        status = 'active',
        updated_at = now()
    `;
    await tx`
      insert into platform_organization_settings (organization_id)
      values (${principal.organizationId})
      on conflict (organization_id) do nothing
    `;
  });
}
