import Link from "next/link";
import { BrandLogo } from "./Brand";

const intelligenceSystems = [
  ["01", "Atlas", "Catalog Intelligence", "Audits listings, identifies conversion gaps, and stages optimized content."],
  ["02", "Vector", "Advertising Intelligence", "Finds wasted spend, protects profitable revenue, and coordinates bid decisions."],
  ["03", "Oracle", "Demand Intelligence", "Connects demand, supply, and stockout risk before revenue is lost."],
  ["04", "Sentinel", "Compliance Intelligence", "Tracks documentation exposure and prioritizes the revenue at risk."],
  ["05", "Forge", "Creative Intelligence", "Turns customer and search insight into conversion-focused creative briefs."],
  ["06", "Pulse", "Executive Intelligence", "Explains what changed, why it matters, and what leadership should do next."],
];

export function HeroSection() {
  return (
    <section className="mf-hero" id="mercury">
      <div className="mf-hero-inner">
        <div className="mf-kicker">Commerce Intelligence Platform</div>
        <h1>
          Intelligence that understands your business.
          <span>Execution that moves it forward.</span>
        </h1>
        <p>
          MerchantFlare continuously analyzes, prioritizes, and improves commerce operations through Mercury—one governed intelligence engine coordinating every critical function.
        </p>
        <div className="mf-hero-actions">
          <a className="mf-button primary" href="mailto:hello@merchantflare.com">Book a demo</a>
          <Link className="mf-button" href="/login">Enter Mercury</Link>
        </div>
        <MercuryPreview />
      </div>
    </section>
  );
}

function MercuryPreview() {
  return (
    <div className="mf-stage" aria-label="Mercury Commerce Intelligence Engine preview">
      <div className="mf-screen">
        <div className="mf-screen-inner">
          <div className="mf-screen-bar"><i /><i /><i /><strong>Mercury · Commerce Intelligence Engine</strong></div>
          <div className="mf-dashboard">
            <aside className="mf-side">
              <BrandLogo className="mf-preview-logo" decorative variant="monogram" />
              <div className="mf-side-nav"><span /><span /><span /><span /><span /></div>
            </aside>
            <section className="mf-main">
              <div className="mf-main-head">
                <div><small>MERCURY</small><h2>Good morning. I found 12 opportunities.</h2></div>
                <div className="mf-health">92</div>
              </div>
              <div className="mf-command"><span>Increase profit while protecting revenue.</span><b>Run plan</b></div>
              <div className="mf-metrics">
                <div className="mf-metric"><span>Projected revenue</span><strong>$4.28M</strong></div>
                <div className="mf-metric"><span>Estimated upside</span><strong>+$248K</strong></div>
                <div className="mf-metric"><span>Commerce health</span><strong>92 / 100</strong></div>
              </div>
              <div className="mf-grid">
                <article className="mf-panel"><small>PRIORITY PLAN</small><h3>Three actions ready for approval.</h3><p>Recover wasted ad spend, prevent a stockout, and resolve a catalog suppression risk.</p></article>
                <article className="mf-panel"><small>INTELLIGENCE SYSTEMS</small><h3>Six systems online.</h3><div className="mf-worker-row"><i /><i /><i /><i /><i /><i /></div></article>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlatformSection() {
  return (
    <section className="mf-section center" id="platform">
      <div className="mf-section-label">One connected intelligence layer</div>
      <h2>Every signal. Every decision. Every action.</h2>
      <p className="mf-section-lead">
        MerchantFlare replaces disconnected dashboards and repetitive workflows with a system that understands objectives, coordinates specialists, and keeps material decisions under human control.
      </p>
      <div className="mf-feature-grid">
        <article className="mf-feature-card">
          <div className="mf-feature-number">01 / UNDERSTAND</div>
          <h3>See what matters now.</h3>
          <p>Mercury interprets revenue, advertising, inventory, catalog, compliance, and customer signals together.</p>
          <div className="mf-feature-visual"><div className="mf-bars"><i /><i /><i /><i /><i /><i /></div></div>
        </article>
        <article className="mf-feature-card">
          <div className="mf-feature-number">02 / COORDINATE</div>
          <h3>Set the outcome.</h3>
          <p>Mercury converts business objectives into plans and routes each task to the right intelligence system.</p>
          <div className="mf-feature-visual"><div className="mf-orbit"><b>M</b></div></div>
        </article>
        <article className="mf-feature-card">
          <div className="mf-feature-number">03 / GOVERN</div>
          <h3>Move with control.</h3>
          <p>Budget, catalog, inventory, and compliance actions stay approval-gated, traceable, and reviewable.</p>
          <div className="mf-feature-visual"><div className="mf-checks"><span>Budget change staged</span><span>Catalog update reviewed</span><span>Compliance action approved</span></div></div>
        </article>
      </div>
    </section>
  );
}

export function IntelligenceSection() {
  return (
    <section className="mf-section" id="intelligence">
      <div className="mf-section-label">Specialized intelligence</div>
      <h2>One intelligence. Six specialists.</h2>
      <p className="mf-section-lead">
        Each system is purpose-built for a critical commerce discipline. Mercury connects them into one coordinated operating model.
      </p>
      <div className="mf-workers">
        {intelligenceSystems.map(([number, name, title, body]) => (
          <article className="mf-worker" key={name}>
            <b>{number}</b>
            <h3>{name}</h3>
            <p><strong>{title}</strong><br />{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function EnterpriseSection() {
  return (
    <section className="mf-section center" id="enterprise">
      <div className="mf-section-label">Enterprise by design</div>
      <h2>Intelligence at speed. Human authority.</h2>
      <p className="mf-section-lead">
        Approval workflows, audit history, secure integrations, role-based access, and executive visibility are built into the platform from the beginning.
      </p>
    </section>
  );
}

export function ClosingSection() {
  return (
    <>
      <section className="mf-cta">
        <div className="mf-section-label">MerchantFlare</div>
        <h2>Where commerce becomes intelligent.</h2>
        <p>See how Mercury can understand, coordinate, and improve your commerce operation.</p>
        <a className="mf-button primary" href="mailto:hello@merchantflare.com">Book a private demo</a>
      </section>
      <footer className="mf-footer">
        <BrandLogo className="mf-footer-logo" />
        <span>© 2026 MerchantFlare. Commerce Intelligence Platform.</span>
        <div className="mf-footer-links"><Link href="/login">Customer login</Link><a href="mailto:hello@merchantflare.com">Contact</a></div>
      </footer>
    </>
  );
}
