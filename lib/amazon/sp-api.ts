const LWA_TOKEN_URL = "https://api.amazon.com/auth/o2/token";

export type SpApiRegion = "na" | "eu" | "fe";

const SP_API_ENDPOINTS: Record<SpApiRegion, string> = {
  na: "https://sellingpartnerapi-na.amazon.com",
  eu: "https://sellingpartnerapi-eu.amazon.com",
  fe: "https://sellingpartnerapi-fe.amazon.com",
};

type LwaTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type MarketplaceParticipation = {
  marketplace: {
    id: string;
    name: string;
    countryCode: string;
    defaultCurrencyCode: string;
    defaultLanguageCode: string;
    domainName: string;
  };
  participation: {
    isParticipating: boolean;
    hasSuspendedListings: boolean;
  };
};

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function configuredRegion(): SpApiRegion {
  const value = (process.env.AMAZON_SP_API_REGION || "na").toLowerCase();
  if (value !== "na" && value !== "eu" && value !== "fe") {
    throw new Error("AMAZON_SP_API_REGION must be one of: na, eu, fe.");
  }
  return value;
}

function amazonTimestamp(date = new Date()): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

export function isSpApiConfigured(): boolean {
  return Boolean(
    process.env.AMAZON_LWA_CLIENT_ID?.trim() &&
      process.env.AMAZON_LWA_CLIENT_SECRET?.trim() &&
      process.env.AMAZON_SP_API_REFRESH_TOKEN?.trim(),
  );
}

export async function getLwaAccessToken(): Promise<LwaTokenResponse> {
  const response = await fetch(LWA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: requiredEnv("AMAZON_SP_API_REFRESH_TOKEN"),
      client_id: requiredEnv("AMAZON_LWA_CLIENT_ID"),
      client_secret: requiredEnv("AMAZON_LWA_CLIENT_SECRET"),
    }),
    cache: "no-store",
  });

  const payload = (await response.json()) as LwaTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new Error(
      payload.error_description || payload.error || `LWA token request failed with status ${response.status}.`,
    );
  }

  return payload;
}

export async function callSpApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const region = configuredRegion();
  const endpoint = SP_API_ENDPOINTS[region];
  const token = await getLwaAccessToken();
  const url = new URL(path, endpoint);

  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  headers.set("host", url.host);
  headers.set("user-agent", "MerchantFlare/0.1.0");
  headers.set("x-amz-access-token", token.access_token);
  headers.set("x-amz-date", amazonTimestamp());

  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      payload?.errors?.[0]?.message ||
      payload?.message ||
      `SP-API request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload as T;
}

export async function getMarketplaceParticipations(): Promise<MarketplaceParticipation[]> {
  const response = await callSpApi<{ payload?: MarketplaceParticipation[] }>(
    "/sellers/v1/marketplaceParticipations",
  );
  return response.payload ?? [];
}
