"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("jmartin@merchantflare.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to sign in.");
      router.replace(payload.redirectTo || "/dashboard");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <a className="login-logo" href="/" aria-label="MerchantFlare home">
          <img src="/merchantflare-logo.svg" alt="MerchantFlare" />
        </a>
        <div className="login-hero-copy">
          <span>MERCURY COMMAND</span>
          <h1>Your AI operating system for commerce.</h1>
          <p>Coordinate advertising, catalog, inventory, compliance, creative, and executive reporting from one command center.</p>
        </div>
        <div className="login-system-status"><i /> Mercury systems operational</div>
      </section>

      <section className="login-form-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-card-heading">
            <span>ADMIN ACCESS</span>
            <h2>Sign in to MerchantFlare</h2>
            <p>Use your MerchantFlare administrator credentials.</p>
          </div>

          <label>
            Email address
            <input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>

          <label>
            Password
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>

          {error && <p className="login-error" role="alert">{error}</p>}

          <button type="submit" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"}</button>
          <small>Protected administrative environment · merchantflare.com</small>
        </form>
      </section>
    </main>
  );
}
