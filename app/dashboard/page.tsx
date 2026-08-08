import DecisionLab from "./DecisionLab";
import "./decision-lab.css";
import { hasPermission } from "../../lib/platform/authorization";
import { getAuthenticatedPrincipal } from "../../lib/server-auth";

export default async function DashboardPage() {
  const principal = await getAuthenticatedPrincipal();
  return (
    <DecisionLab
      canWrite={principal ? hasPermission(principal, "decisions.write") : false}
      canAudit={principal ? hasPermission(principal, "audit.read") : false}
    />
  );
}
