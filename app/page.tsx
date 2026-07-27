import Link from "next/link";

const capabilities = [
  "Marketplace performance intelligence",
  "AI listing and catalog operations",
  "Advertising optimization workflows",
  "Inventory and compliance monitoring",
];

export default function HomePage() {
  return (
    <main className="hero">
      <div className="hero-inner">
        <div className="eyebrow">MerchantFlare presents Mercury</div>
        <h1>The AI operating system for commerce.</h1>
        <p>
          Connect marketplace data, deploy specialized AI workers, and operate
          your catalog, advertising, inventory, and compliance from one command center.
        </p>
        <div className="cta-row">
          <Link className="btn primary" href="/dashboard">Open Mercury Command Center</Link>
          <a className="btn secondary" href="#capabilities">Explore capabilities</a>
        </div>
        <div id="capabilities" className="grid metrics" style={{ marginTop: 48, textAlign: "left" }}>
          {capabilities.map((capability, index) => (
            <div className="card" key={capability}>
              <div className="eyebrow">0{index + 1}</div>
              <div className="card-value" style={{ fontSize: 18 }}>{capability}</div>
              <div className="muted">Built into the Mercury commerce intelligence layer.</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
