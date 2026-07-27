import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
};

export function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <label className="ui-field" htmlFor={htmlFor}>
      <span className="ui-field__label">{label}</span>
      {children}
      {hint ? <span className="ui-field__hint">{hint}</span> : null}
    </label>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`ui-input ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`ui-textarea ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`ui-select ${className}`} {...props} />;
}

export function Divider({ className = "" }: { className?: string }) {
  return <hr className={`ui-divider ${className}`} />;
}

export function Avatar({ initials, className = "" }: { initials: string; className?: string }) {
  return <span className={`ui-avatar ${className}`} aria-label={initials}>{initials}</span>;
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`ui-spinner ${className}`} role="status" aria-label="Loading" />;
}
