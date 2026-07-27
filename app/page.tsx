import Link from "next/link";
import "./marketing-brand.css";

const workers = [
  ["01", "Atlas", "Catalog intelligence", "Audits listings, identifies conversion gaps, and stages optimized content."],
  ["02", "Vector", "Advertising control", "Finds wasted spend, protects profitable revenue, and coordinates bid decisions."],
  ["03", "Oracle", "Inventory forecasting", "Connects demand, supply, and stockout risk before revenue is lost."],
  ["04", "Sentinel", "Compliance defense", "Tracks documentation exposure and prioritizes the revenue at risk."],
  ["05", "Forge", "Creative operations", "Turns customer and search insight into conversion-focused creative briefs."],
  ["06", "Pulse", "Executive reporting", "Explains what changed, why it matters, and what leadership should do next."],
];

function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={className} aria-label="MerchantFlare home">
      <img src="/merchantflare-logo.svg" alt="MerchantFlare — The AI Workforce for Commerce" />
    </Link>
  );
}

export default function HomePage() {
  return (
    <main className="marketing-shell">
      <div className="mf-nav-wrap">
        <nav className="mf-nav" aria-label="Primary navigation">
          <Logo className="mf-nav-logo" />
          <div className="mf-nav-links">
            <a href="#mercury">Mercury</a>
            <a href="#platform">Platform</a>
            <a href="#workers">Workers</a>
            <a href="#enterprise">Enterprise</a>
          </div>
          <div className="mf-nav-actions">
            <Link className="mf-login" href="/login">Log in</Link>
            <a className="mf-button primary" href="mailto:hello@merchantflare.com">Book a demo</a>
          </div>
        </nav>
      </div>

      <section className="mf-hero" id="mercury">
        <div className="mf-hero-inner">
          <div className="mf-kicker">The AI operating system for commerce</div>
          <h1>
            Command your commerce business.
            <span>From one intelligent system.</span>
          </h1>
          <p>
            MerchantFlare coordinates catalog, advertising, inventory, compliance, creative, and executive reporting through one governed AI workforce.
          </p>
          <div className="mf-hero-actions">
            <a className="mf-button primary" href="mailto:hello@merchantflare.com">Book a demo</a>
            <Link className="mf-button" href="/login">Enter Mercury</Link>
          </div>

          <div className="mf-stage" aria-label="Mercury command center product preview">
            <div className="mf-screen">
              <div className="mf-screen-inner">
                <div className="mf-screen-bar"><i /><i /><i /><strong>Mercury Command Center</strong></div>
                <div className="mf-dashboard">
                  <aside className="mf-side">
                    <img src="/merchantflare-logo.svg" alt="" />
                    <div className="mf-side-nav"><span /><span /><span /><span /><span /></div>
                  </aside>
                  <section className="mf-main">
                    <div className="mf-main-head">
                      <div><small>MERCURY</small><h2>What should we accomplish today?</h2></div>
                      <div className="mf-health">86</div>
                    </div>
                    <div className="mf-command"><span>Improve profitability without reducing revenue.</span><b>Run</b></div>
                    <div className="mf-metrics">
                      <div className="mf-metric"><span>Revenue</span><strong>$2.48M</strong></div>
                      <div className="mf-metric"><span>TACoS</span><strong>8.8%</strong></div>
                      <div className="mf-metric"><span>Health</span><strong>86 / 100</strong></div>
                    </div>
                    <div className="mf-grid">
                      <article className="mf-panel"><small>DECISION QUEUE</small><h3>Three actions require attention.</h3><p>Advertising efficiency, stockout exposure, and compliance risk.</p></article>
                      <article className="mf-panel"><small>AI WORKFORCE</small><h3>Six workers online.</h3><div className="mf-worker-row"><i /><i /><i /><i /><i /><i /></div></article>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mf-section center" id="platform">
        <div className="mf-section-label">A new operating layer</div>
        <h2>Every signal. Every decision. One coordinated system.</h2>
        <p className="mf-section-lead">
          MerchantFlare replaces disconnected dashboards and repetitive workflows with a single command layer that understands the business objective and coordinates the work required to reach it.
        </p>

        <div className="mf-feature-grid">
          <article className="mf-feature-card">
            <div className="mf-feature-number">01 / INTELLIGENCE</div>
            <h3>See what matters now.</h3>
            <p>Mercury continuously interprets revenue, advertising, inventory, catalog, and compliance signals.</p>
            <div className="mf-feature-visual"><div className="mf-bars"><i /><i /><i /><i /><i /><i /></div></div>
          </article>

          <article className="mf-feature-card">
            <div className="mf-feature-number">02 / ORCHESTRATION</div>
            <h3>Give the system an outcome.</h3>
            <p>Mercury translates the objective into a coordinated plan and assigns the right workers automatically.</p>
            <div className="mf-feature-visual"><div className="mf-orbit"><b>M</b></div></div>
          </article>

          <article className="mf-feature-card">
            <div className="mf-feature-number">03 / CONTROL</div>
            <h3>Move fast without losing governance.</h3>
            <p>Material actions remain approval-gated, traceable, and visible to the people responsible for the business.</p>
            <div className="mf-feature-visual"><div className="mf-checks"><span>Budget change staged</span><span>Catalog update reviewed</span><span>Compliance action approved</span></div></div>
          </article>
        </div>
      </section>

      <section className="mf-section" id="workers">
        <div className="mf-section-label">The MerchantFlare workforce</div>
        <h2>Specialized intelligence. Working as one.</h2>
        <p className="mf-section-lead">
          Each worker is purpose-built for a critical commerce function. Mercury coordinates them as one operating system.
        </p>
        <div className="mf-workers">
          {workers.map(([number, name, title, body]) => (
            <article className="mf-worker" key={name}>
              <b>{number}</b>
              <h3>{name}</h3>
              <p><strong>{title}</strong><br />{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mf-section center" id="enterprise">
        <div className="mf-section-label">Built for operators</div>
        <h2>AI speed. Enterprise control.</h2>
        <p className="mf-section-lead">
          Approval workflows, auditability, secure integrations, and executive visibility are built into the operating model from the beginning.
        </p>
      </section>

      <section className="mf-cta">
        <h2>Put your commerce operation on autopilot—without giving up control.</h2>
        <p>See how MerchantFlare can coordinate the work your team performs across Amazon and the broader marketplace ecosystem.</p>
        <a className="mf-button primary" href="mailto:hello@merchantflare.com">Book a private demo</a>
      </section>

      <footer className="mf-footer">
        <Logo />
        <span>© 2026 MerchantFlare. AI commerce operations with human control.</span>
        <div className="mf-footer-links"><Link href="/login">Customer login</Link><a href="mailto:hello@merchantflare.com">Contact</a></div>
      </footer>
    </main>
  );
}
