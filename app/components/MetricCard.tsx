import type { ReactNode } from "react";

type MetricCardProps = {
  title: string;
  value: string;
  change?: string;
  icon?: ReactNode;
};

export default function MetricCard({ title, value, change, icon }: MetricCardProps) {
  return (
    <article className="card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div className="card-label">{title}</div>
        {icon}
      </div>
      <div className="card-value">{value}</div>
      {change && <div className="delta">{change}</div>}
    </article>
  );
}
