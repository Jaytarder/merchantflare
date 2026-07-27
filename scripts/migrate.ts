import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";

type Migration = {
  name: string;
  checksum: string;
  sql: string;
};

const migrationPattern = /^\d{3}_[a-z0-9_]+\.sql$/;
const migrationsDirectory = resolve(process.cwd(), "db", "migrations");
const dryRun = process.argv.includes("--dry-run");

async function loadMigrations(): Promise<Migration[]> {
  const entries = await readdir(migrationsDirectory, { withFileTypes: true });
  const sqlFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
  const invalidNames = sqlFiles.filter((name) => !migrationPattern.test(name));
  if (invalidNames.length > 0) {
    throw new Error(
      `Invalid migration filename${invalidNames.length === 1 ? "" : "s"}: ${invalidNames.join(", ")}.`,
    );
  }

  const sequences = new Set<string>();
  for (const name of sqlFiles) {
    const sequence = name.slice(0, 3);
    if (sequences.has(sequence)) {
      throw new Error(`Duplicate migration sequence ${sequence}.`);
    }
    sequences.add(sequence);
  }

  if (sqlFiles.length === 0) {
    throw new Error("No numbered SQL migrations were found.");
  }

  return Promise.all(
    sqlFiles.map(async (name) => {
      const sql = await readFile(resolve(migrationsDirectory, name), "utf8");
      return {
        name,
        sql,
        checksum: createHash("sha256").update(sql).digest("hex"),
      };
    }),
  );
}

async function main() {
  const migrations = await loadMigrations();

  if (dryRun) {
    for (const migration of migrations) {
      console.log(`${migration.name} ${migration.checksum}`);
    }
    console.log(`Validated ${migrations.length} migrations.`);
    return;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required. Use npm run migrate:dry-run to validate files without a database.",
    );
  }

  const client = postgres(connectionString, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 20,
    ssl: process.env.NODE_ENV === "production" ? "require" : undefined,
  });
  let connection: Awaited<ReturnType<typeof client.reserve>> | undefined;

  try {
    connection = await client.reserve();
    await connection`select pg_advisory_lock(hashtext('merchantflare_migrations'))`;
    await connection`
      create table if not exists merchantflare_schema_migrations (
        name text primary key,
        checksum text not null,
        applied_at timestamptz not null default now()
      )
    `;

    const applied = await connection<
      Array<{ name: string; checksum: string }>
    >`
      select name, checksum
      from merchantflare_schema_migrations
      order by name
    `;
    const appliedByName = new Map(
      applied.map((migration) => [migration.name, migration.checksum]),
    );
    const availableNames = new Set(migrations.map((migration) => migration.name));
    const missingFiles = applied
      .map((migration) => migration.name)
      .filter((name) => !availableNames.has(name));
    if (missingFiles.length > 0) {
      throw new Error(
        `Applied migration file${missingFiles.length === 1 ? " is" : "s are"} missing: ${missingFiles.join(", ")}.`,
      );
    }

    for (const migration of migrations) {
      const appliedChecksum = appliedByName.get(migration.name);
      if (appliedChecksum) {
        if (appliedChecksum !== migration.checksum) {
          throw new Error(
            `Migration ${migration.name} changed after it was applied.`,
          );
        }
        console.log(`Already applied ${migration.name}`);
        continue;
      }

      await connection.begin(async (transaction) => {
        await transaction.unsafe(migration.sql);
        await transaction`
          insert into merchantflare_schema_migrations (name, checksum)
          values (${migration.name}, ${migration.checksum})
        `;
      });
      console.log(`Applied ${migration.name}`);
    }
  } finally {
    if (connection) {
      try {
        await connection`select pg_advisory_unlock(hashtext('merchantflare_migrations'))`;
      } finally {
        connection.release();
      }
    }
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Migration failed.");
  process.exitCode = 1;
});
