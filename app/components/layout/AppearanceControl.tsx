"use client";

import { useEffect, useState } from "react";

type Appearance = "system" | "light" | "dark";

const appearances: Appearance[] = ["system", "light", "dark"];

function applyAppearance(appearance: Appearance) {
  if (appearance === "system") delete document.documentElement.dataset.mfTheme;
  else document.documentElement.dataset.mfTheme = appearance;
}

function AppearanceIcon({ appearance }: { appearance: Appearance }) {
  if (appearance === "light") return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
  if (appearance === "dark") return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M19 15.3A7.7 7.7 0 0 1 8.7 5a7.8 7.8 0 1 0 10.3 10.3Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>;
  return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3.5" y="5" width="17" height="12" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M9 21h6M12 17v4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
}

export default function AppearanceControl() {
  const [appearance, setAppearance] = useState<Appearance>("system");

  useEffect(() => {
    const stored = window.localStorage.getItem("merchantflare-appearance");
    const initial = appearances.includes(stored as Appearance) ? stored as Appearance : "system";
    setAppearance(initial);
    applyAppearance(initial);
  }, []);

  const next = appearances[(appearances.indexOf(appearance) + 1) % appearances.length];

  return (
    <button
      className="platform-icon-button platform-appearance-control"
      type="button"
      aria-label={`Appearance: ${appearance}. Switch to ${next}.`}
      title={`Appearance: ${appearance}`}
      onClick={() => {
        setAppearance(next);
        applyAppearance(next);
        window.localStorage.setItem("merchantflare-appearance", next);
      }}
    >
      <AppearanceIcon appearance={appearance} />
    </button>
  );
}
