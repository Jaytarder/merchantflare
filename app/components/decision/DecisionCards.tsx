import type { ReactNode } from "react";

export function ScientificCard({ label, title, children, className = "" }: { label: string; title: string; children: ReactNode; className?: string }) {
  return <article className={`scientific-card ${className}`}><span className="scientific-card-label">{label}</span><h3>{title}</h3>{children}</article>;
}

export function ConfidenceIndicator({ value, label = "Confidence" }: { value: number | null; label?: string }) {
  const bounded = value === null ? 0 : Math.max(0, Math.min(1, value));
  return <div className="confidence-indicator"><div><span>{label}</span><strong>{value === null ? "Not measured" : `${Math.round(bounded * 100)}%`}</strong></div><div className="confidence-track" aria-hidden="true"><span style={{ width: `${bounded * 100}%` }} /></div></div>;
}

export function UncertaintyMeter({ value }: { value: number | null }) {
  return <ConfidenceIndicator value={value} label="Uncertainty" />;
}

export function ApprovalBanner({ status }: { status: string }) {
  return <div className={`approval-banner is-${status}`}><strong>Approval</strong><span>{status.replaceAll("_", " ")}</span></div>;
}
