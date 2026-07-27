import Link from "next/link";
import "./marketing-brand.css";

const capabilities = [
  ["Atlas", "Catalog intelligence", "Audits listings, finds conversion gaps, and prepares optimized content."],
  ["Vector", "Advertising control", "Finds wasted spend, protects profitable revenue, and stages bid decisions."],
  ["Oracle", "Inventory forecasting", "Surfaces stockout risk and connects demand signals to replenishment actions."],
  ["Sentinel", "Compliance defense", "Tracks documentation risk and prioritizes revenue exposure before suppression."],
  ["Forge", "Creative operations", "Turns customer and search insights into conversion-focused creative briefs."],
  ["Pulse", "Executive reporting", "Explains what changed, why it matters, and what leadership should do next."],
];

const plans = [
  { name: "Launch", price: "$499", description: "For growing marketplace teams building their first AI operating layer.", features: ["1 marketplace account", "Mercury command center", "Catalog and advertising audits", "Weekly executive brief"] },
  { name: "Scale", price: "$1,499", description: "For established brands managing meaningful catalog and ad complexity.", features: ["Up to 3 marketplace accounts", "All six Mercury workers", "Approval workflows", "Inventory and compliance monitoring"], featured: true },
  { name: "Enterprise", price: "Custom", description: "For multi-brand operators that need security, integrations, and control.", features: ["Unlimited account architecture", "Custom worker workflows", "API and data warehouse integrations", "Dedicated implementation"] },
];

function MarketingLogo({ footer = false }: { footer?: boolean }) {
  return (
    <Link className={`marketing-brand-logo${footer ? " footer-logo" : ""}`} href="/" aria-label="MerchantFlare home">
      <img src="/merchantflare-logo.svg" alt="MerchantFlare — The AI Workforce for Commerce" />
    </Link>
  );
}

export default function HomePage() {
  return (
    <main className="marketing-shell">
      <nav className="marketing-nav">
        <MarketingLogo />
        <div className="marketing-links">
          <a href="#product">Product</a><a href="#workers">Workers</a><a href="#pricing">Pricing</a>
        </div>
        <div className="marketing-actions"><Link className="nav-login" href="/login">Log in</Link><a className="btn primary small" href="#contact">Book a demo</a></div>
      </nav>

      <section className="marketing-hero">
        <div className="hero-glow" />
        <div className="marketing-copy">
          <div className="eyebrow">The AI operating system for commerce</div>
          <h1>Run your marketplace operation from one intelligent command center.</h1>
          <p>MerchantFlare coordinates specialized AI workers across catalog, advertising, inventory, compliance, creative, and reporting—while keeping material decisions under your control.</p>
          <div className="hero-actions"><a className="btn primary" href="#contact">Book a demo</a><Link className="btn secondary" href="/login">Customer login</Link></div>
          <div className="trust-row"><span>Built for Amazon-first brands</span><span>Approval-gated execution</span><span>Executive-level visibility</span></div>
        </div>

        <div className="product-window" id="product" aria-label="Mercury command center preview">
          <div className="window-bar"><span /><span /><span /><strong>Mercury Command Center</strong></div>
          <div className="window-layout">
            <div className="window-sidebar"><div className="mini-brand">M</div><span className="active" /><span /><span /><span /><span /></div>
            <div className="window-main">
              <div className="window-head"><div><small>MERCURY</small><h3>What should we accomplish today?</h3></div><b>86</b></div>
              <div className="window-command">Improve ROAS without reducing revenue <i>Run</i></div>
              <div className="window-metrics"><div><small>Revenue</small><strong>$1.42M</strong></div><div><small>TACoS</small><strong>8.9%</strong></div><div><small>Health</small><strong>86 / 100</strong></div></div>
              <div className="window-grid"><div className="window-card"><small>DECISION QUEUE</small><strong>3 priorities require attention</strong><p>Compliance exposure · Inventory risk · Advertising inefficiency</p></div><div className="window-card"><small>WORKFORCE</small><strong>6 AI workers online</strong><div className="worker-dots"><span /><span /><span /><span /><span /><span /></div></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="logo-strip"><span>CATALOG</span><span>ADVERTISING</span><span>INVENTORY</span><span>COMPLIANCE</span><span>CREATIVE</span><span>REPORTING</span></section>

      <section className="marketing-section" id="workers">
        <div className="section-heading"><div className="eyebrow">Specialized AI workforce</div><h2>One objective. The right workers. A coordinated plan.</h2><p>Mercury breaks business goals into governed tasks, routes them to the correct worker, and records every decision.</p></div>
        <div className="capability-grid">{capabilities.map(([name, title, body]) => <article className="capability-card" key={name}><span>{name.charAt(0)}</span><div><small>{name}</small><h3>{title}</h3><p>{body}</p></div></article>)}</div>
      </section>

      <section className="marketing-section workflow-section">
        <div className="section-heading"><div className="eyebrow">From instruction to execution</div><h2>AI speed without losing operational control.</h2></div>
        <div className="workflow-grid"><div><b>01</b><h3>Set the objective</h3><p>Tell Mercury the business outcome, not a list of manual tasks.</p></div><div><b>02</b><h3>Review the plan</h3><p>See dependencies, owners, expected impact, and approval requirements.</p></div><div><b>03</b><h3>Approve material actions</h3><p>Budget, catalog, inventory, and compliance changes remain governed.</p></div><div><b>04</b><h3>Track the result</h3><p>Every action and outcome is visible in a live operating timeline.</p></div></div>
      </section>

      <section className="marketing-section pricing-section" id="pricing">
        <div className="section-heading"><div className="eyebrow">Pricing</div><h2>Start with the operating layer your team needs.</h2><p>Preview pricing for early MerchantFlare customers. Final packaging will reflect marketplace scope and integration requirements.</p></div>
        <div className="pricing-grid">{plans.map((plan) => <article className={`pricing-card ${plan.featured ? "featured" : ""}`} key={plan.name}>{plan.featured && <div className="popular">Most popular</div>}<h3>{plan.name}</h3><div className="price">{plan.price}{plan.price.startsWith("$") && <span>/month</span>}</div><p>{plan.description}</p><ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul><a className={`btn ${plan.featured ? "primary" : "secondary"}`} href="#contact">Talk to sales</a></article>)}</div>
      </section>

      <section className="cta-section" id="contact"><div><div className="eyebrow">MerchantFlare early access</div><h2>See how Mercury would operate your commerce business.</h2><p>We will map your current workflows, identify the highest-value automation opportunities, and show the command center using your operating model.</p></div><a className="btn primary" href="mailto:hello@merchantflare.com">Book a demo</a></section>

      <footer className="marketing-footer"><MarketingLogo footer /><p>AI commerce operations with human control.</p><div><Link href="/login">Customer login</Link><a href="#pricing">Pricing</a></div></footer>
    </main>
  );
}
