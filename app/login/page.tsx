import Link from "next/link";
import { Logo } from "../../components/brand/Logo";
import { isAuthenticationConfigured, safeRedirectPath } from "../../lib/auth";
import "./login.css";
import "../components/premium-application.css";

const errorMessages: Record<string, string> = {
  authorization_cancelled: "Sign-in was cancelled. You can try again when ready.",
  callback_invalid: "This sign-in link is invalid or has expired. Start a new sign-in.",
  callback_failed: "Cognito could not complete sign-in. Try again or contact your administrator.",
  configuration_unavailable: "Authentication has not been configured for this environment.",
  email_unverified: "Verify your email address in Cognito before signing in.",
  membership_required: "Your identity is verified, but it is not assigned to a MerchantFlare organization. Contact an organization Owner.",
  service_unavailable: "MerchantFlare could not resolve your organization. Try again later.",
  session_expired: "Your session expired. Sign in again to continue.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  const query = await searchParams;
  const configured = isAuthenticationConfigured();
  const returnTo = safeRedirectPath(query.returnTo);
  const error = query.error ? errorMessages[query.error] ?? errorMessages.callback_failed : null;

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <Link className="login-logo" href="/" aria-label="MerchantFlare home">
          <Logo variant="horizontal" surface="auto" tagline priority />
        </Link>
        <div className="login-hero-copy">
          <span>SCIENTIFIC DECISION PLATFORM</span>
          <h1>Make better decisions with less uncertainty.</h1>
          <p>Turn evidence, competing explanations, governed experiments, and measured outcomes into durable organizational learning.</p>
        </div>
        <div className="login-system-status">Decision Lab · Evidence before assertion</div>
      </section>

      <section className="login-form-panel">
        <div className="login-card">
          <div className="login-card-heading">
            <span>SECURE ACCESS</span>
            <h2>Sign in to MerchantFlare</h2>
            <p>Continue through the MerchantFlare identity service.</p>
          </div>

          {error && <p className="login-error" role="alert">{error}</p>}

          {configured ? (
            <>
              <a className="login-submit" href={`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`}>
                Continue with Cognito
              </a>
              <a className="login-recovery" href="/api/auth/forgot-password">
                Forgot or reset your password
              </a>
            </>
          ) : (
            <p className="login-configuration" role="status">
              An administrator must configure Cognito before sign-in is available.
            </p>
          )}
          <small>Protected organization environment · merchantflare.com</small>
        </div>
      </section>
    </main>
  );
}
