import Link from "next/link";

type LogoProps = {
  className?: string;
  decorative?: boolean;
};

export function BrandLogo({ className = "", decorative = false }: LogoProps) {
  return (
    <Link href="/" className={className} aria-label="MerchantFlare home">
      <img
        src="/merchantflare-logo.svg"
        alt={decorative ? "" : "MerchantFlare — Commerce Intelligence Platform"}
      />
    </Link>
  );
}

export function MarketingNavigation() {
  return (
    <div className="mf-nav-wrap">
      <nav className="mf-nav" aria-label="Primary navigation">
        <BrandLogo className="mf-nav-logo" />
        <div className="mf-nav-links">
          <a href="#mercury">Mercury</a>
          <a href="#platform">Platform</a>
          <a href="#workers">Intelligence</a>
          <a href="#enterprise">Enterprise</a>
        </div>
        <div className="mf-nav-actions">
          <Link className="mf-login" href="/login">Log in</Link>
          <a className="mf-button primary" href="mailto:hello@merchantflare.com">Book a demo</a>
        </div>
      </nav>
    </div>
  );
}
