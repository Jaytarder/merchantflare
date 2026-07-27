import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "../../lib/server-auth";
import AppShell from "../components/layout/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthenticatedAdmin();

  if (!session) {
    redirect("/login");
  }

  return <AppShell userEmail={session.email}>{children}</AppShell>;
}
