import { redirect } from "next/navigation";
import { getDatabase } from "../../../lib/db";
import { PostgresNotificationService } from "../../../lib/platform/notifications";
import { getAuthenticatedPrincipal } from "../../../lib/server-auth";
import AppShell from "./AppShell";

export default async function AuthenticatedAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthenticatedPrincipal();
  if (!session) redirect("/login");

  const sql = getDatabase();
  const notifications = sql
    ? await new PostgresNotificationService(sql).list(session, { limit: 10 })
    : [];

  return (
    <AppShell
      userEmail={session.email}
      userRole={session.role}
      notifications={notifications}
    >
      {children}
    </AppShell>
  );
}
