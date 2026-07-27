import Link from "next/link";

function displayName(email: string) {
  return email
    .split("@")[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function initials(email: string) {
  const name = displayName(email);
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2) || "MF";
}

export default function UserMenu({ email }: { email: string }) {
  const name = displayName(email);

  return (
    <details className="platform-popover platform-user-menu">
      <summary className="platform-user">
        <span className="platform-avatar" aria-hidden="true">{initials(email)}</span>
        <span className="platform-user-copy">
          <strong>{name}</strong>
          <small>Administrator</small>
        </span>
        <span className="platform-user-chevron" aria-hidden="true">⌄</span>
      </summary>
      <div className="platform-popover-panel platform-user-panel">
        <div className="platform-user-identity">
          <strong>{name}</strong>
          <span>{email}</span>
        </div>
        <Link href="/settings">Workspace settings</Link>
        <Link href="/">MerchantFlare website</Link>
        <form action="/api/auth/logout" method="post">
          <button type="submit">Sign out</button>
        </form>
      </div>
    </details>
  );
}
