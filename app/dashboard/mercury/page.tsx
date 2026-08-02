import MercuryWorkspace from "../MercuryWorkspace";
import "../mercury-workspace.css";
import { hasPermission } from "../../../lib/platform/authorization";
import { getAuthenticatedPrincipal } from "../../../lib/server-auth";

export default async function MercuryPage() {
  const principal = await getAuthenticatedPrincipal();
  return <MercuryWorkspace canWrite={principal ? hasPermission(principal, "mercury.write") : false} canApprove={principal ? hasPermission(principal, "mercury.approve") : false} canAudit={principal ? hasPermission(principal, "audit.read") : false} />;
}
