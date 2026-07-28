import type { CognitoAuthConfig } from "./config";

export type CognitoTokens = {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
};

export function callbackUrl(config: CognitoAuthConfig) {
  return `${config.applicationBaseUrl}/api/auth/callback`;
}

export function authorizationUrl(
  config: CognitoAuthConfig,
  input: { state: string; nonce: string; challenge: string },
) {
  const url = new URL("/oauth2/authorize", config.domain);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: callbackUrl(config),
    scope: "openid email profile",
    state: input.state,
    nonce: input.nonce,
    code_challenge_method: "S256",
    code_challenge: input.challenge,
  }).toString();
  return url;
}

export function logoutUrl(config: CognitoAuthConfig) {
  const url = new URL("/logout", config.domain);
  url.search = new URLSearchParams({
    client_id: config.clientId,
    logout_uri: `${config.applicationBaseUrl}/login`,
  }).toString();
  return url;
}

async function requestTokens(
  config: CognitoAuthConfig,
  parameters: URLSearchParams,
): Promise<CognitoTokens> {
  const response = await fetch(new URL("/oauth2/token", config.domain), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: parameters,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`COGNITO_TOKEN_EXCHANGE_${response.status}`);
  return response.json() as Promise<CognitoTokens>;
}

export function exchangeAuthorizationCode(
  config: CognitoAuthConfig,
  code: string,
  verifier: string,
) {
  return requestTokens(config, new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    code,
    code_verifier: verifier,
    redirect_uri: callbackUrl(config),
  }));
}

export function refreshCognitoTokens(
  config: CognitoAuthConfig,
  refreshToken: string,
) {
  return requestTokens(config, new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.clientId,
    refresh_token: refreshToken,
  }));
}
