export type CognitoAuthConfig = {
  region: string;
  userPoolId: string;
  clientId: string;
  issuer: string;
  domain: string;
  applicationBaseUrl: string;
  sessionSecret: string;
};

export class AuthenticationConfigurationError extends Error {
  readonly code = "AUTH_CONFIGURATION_UNAVAILABLE";

  constructor(readonly missing: readonly string[]) {
    super(`Authentication configuration is unavailable: ${missing.join(", ")}`);
    this.name = "AuthenticationConfigurationError";
  }
}

const REQUIRED_ENVIRONMENT = {
  region: "COGNITO_AWS_REGION",
  userPoolId: "COGNITO_USER_POOL_ID",
  clientId: "COGNITO_APP_CLIENT_ID",
  issuer: "COGNITO_ISSUER_URL",
  domain: "COGNITO_DOMAIN",
  applicationBaseUrl: "APPLICATION_BASE_URL",
  sessionSecret: "AUTH_SESSION_SECRET",
} as const;

function normalizedUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function getCognitoAuthConfig(
  environment: NodeJS.ProcessEnv = process.env,
): CognitoAuthConfig {
  const entries = Object.entries(REQUIRED_ENVIRONMENT).map(([property, name]) => [
    property,
    environment[name]?.trim(),
    name,
  ] as const);
  const missing = entries.filter(([, value]) => !value).map(([, , name]) => name);
  if (missing.length > 0) throw new AuthenticationConfigurationError(missing);

  const values = Object.fromEntries(
    entries.map(([property, value]) => [property, value]),
  ) as Record<keyof CognitoAuthConfig, string>;
  if (Buffer.byteLength(values.sessionSecret, "utf8") < 32) {
    throw new AuthenticationConfigurationError(["AUTH_SESSION_SECRET (minimum 32 bytes)"]);
  }
  const issuer = normalizedUrl(values.issuer);
  const expectedIssuer =
    `https://cognito-idp.${values.region}.amazonaws.com/${values.userPoolId}`;
  if (issuer !== expectedIssuer) {
    throw new AuthenticationConfigurationError([
      "COGNITO_ISSUER_URL (must match COGNITO_AWS_REGION and COGNITO_USER_POOL_ID)",
    ]);
  }
  const domain = normalizedUrl(values.domain);
  if (!domain.startsWith("https://")) {
    throw new AuthenticationConfigurationError(["COGNITO_DOMAIN (HTTPS required)"]);
  }
  const applicationBaseUrl = normalizedUrl(values.applicationBaseUrl);
  if (
    !applicationBaseUrl.startsWith("https://") &&
    !applicationBaseUrl.startsWith("http://localhost:")
  ) {
    throw new AuthenticationConfigurationError([
      "APPLICATION_BASE_URL (HTTPS or localhost required)",
    ]);
  }

  return {
    ...values,
    issuer,
    domain,
    applicationBaseUrl,
  };
}

export function isAuthenticationConfigured(
  environment: NodeJS.ProcessEnv = process.env,
) {
  try {
    getCognitoAuthConfig(environment);
    return true;
  } catch {
    return false;
  }
}
