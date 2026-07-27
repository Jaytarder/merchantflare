import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifyAdminSession } from "../../lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = verifyAdminSession(cookieStore.get(ADMIN_COOKIE)?.value);

  if (!session) {
    redirect("/login");
  }
