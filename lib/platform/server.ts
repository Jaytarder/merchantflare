import { getDatabase } from "../db";
import { PlatformPersistenceUnavailableError } from "./errors";

export function requirePlatformDatabase() {
  const sql = getDatabase();
  if (!sql) throw new PlatformPersistenceUnavailableError();
  return sql;
}
