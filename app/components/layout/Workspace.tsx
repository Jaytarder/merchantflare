import type { ReactNode } from "react";

export default function Workspace({ children }: { children: ReactNode }) {
  return (
    <main className="platform-workspace" id="main-content">
      <div className="platform-workspace-inner">{children}</div>
    </main>
  );
}
