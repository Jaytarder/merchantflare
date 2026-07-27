import Link from "next/link";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ className = "", variant = "secondary", size = "md", ...props }: ButtonProps) {
  return <button className={`ui-button ui-button--${variant} ui-button--${size} ${className}`} {...props} />;
}

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function ButtonLink({ href, children, className = "", variant = "secondary", size = "md" }: ButtonLinkProps) {
  const classes = `ui-button ui-button--${variant} ui-button--${size} ${className}`;
  return href.startsWith("/") ? <Link href={href} className={classes}>{children}</Link> : <a href={href} className={classes}>{children}</a>;
}

export function Container({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ui-container ${className}`} {...props} />;
}

export function Section({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={`ui-section ${className}`} {...props} />;
}

export function Surface({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ui-surface ${className}`} {...props} />;
}

export function Glass({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ui-glass ${className}`} {...props} />;
}

export function Eyebrow({ className = "", ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`ui-eyebrow ${className}`} {...props} />;
}

export function Heading({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`ui-heading ${className}`} {...props} />;
}

export function Text({ className = "", ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`ui-text ${className}`} {...props} />;
}

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "positive" | "warning" | "critical" | "accent";
};

export function Badge({ className = "", tone = "neutral", ...props }: BadgeProps) {
  return <span className={`ui-badge ui-badge--${tone} ${className}`} {...props} />;
}

type MetricProps = {
  label: string;
  value: string;
  detail?: string;
  trend?: string;
  tone?: "neutral" | "positive" | "warning" | "critical";
  className?: string;
};

export function Metric({ label, value, detail, trend, tone = "neutral", className = "" }: MetricProps) {
  return (
    <div className={`ui-metric ui-metric--${tone} ${className}`}>
      <span className="ui-metric__label">{label}</span>
      <strong className="ui-metric__value">{value}</strong>
      {(detail || trend) && <div className="ui-metric__meta">{trend && <b>{trend}</b>}{detail && <span>{detail}</span>}</div>}
    </div>
  );
}

type StatusProps = {
  label: string;
  tone?: "online" | "idle" | "warning" | "critical";
  className?: string;
};

export function Status({ label, tone = "online", className = "" }: StatusProps) {
  return <span className={`ui-status ui-status--${tone} ${className}`}><i />{label}</span>;
}
