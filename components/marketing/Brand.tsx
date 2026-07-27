import Link from "next/link";
import {
  Logo,
  type LogoSurface,
  type LogoVariant,
} from "../brand/Logo";

type LogoProps = {
  className?: string;
  decorative?: boolean;
  variant?: LogoVariant;
  surface?: LogoSurface;
  tagline?: boolean;
  priority?: boolean;
};

export function BrandLogo({
  className = "",
  decorative = false,
  variant = "horizontal",
  surface = "dark",
  tagline = false,
  priority = false,
}: LogoProps) {
  return (
    <Link href="/" className={className} aria-label="MerchantFlare home">
      <Logo
        variant={variant}
        surface={surface}
        tagline={tagline}
        decorative={decorative}
        priority={priority}
      />
    </Link>
  );
}

export function MarketingNavigation() {
  return (
    <div className="mf-nav-wrap">
      <nav className="mf-nav" aria-label="Primary navigation">
        <BrandLogo className="mf-nav-logo" priority />
        <div className="mf-nav-links">
          <a href="#mercury">Mercury</a>
          <a href="#platform">Platform</a>
          <a href="#intelligence">Intelligence</a>
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
