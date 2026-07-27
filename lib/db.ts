import postgres from "postgres";

let client: ReturnType<typeof postgres> | null = null;

export function getDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  if (!client) {
    client = postgres(connectionString, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: process.env.NODE_ENV === "production" ? "require" : undefined,
    });
  }

  return client;
}
