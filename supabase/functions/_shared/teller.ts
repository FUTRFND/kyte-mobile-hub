// Shared Teller mTLS client helpers for Supabase Edge Functions.
// Uses Deno.createHttpClient to attach the Teller application certificate + private key.

const TELLER_BASE = "https://api.teller.io";

let cachedClient: Deno.HttpClient | null = null;

function getTellerClient(): Deno.HttpClient {
  if (cachedClient) return cachedClient;
  const cert = Deno.env.get("TELLER_CERTIFICATE");
  const key = Deno.env.get("TELLER_PRIVATE_KEY");
  if (!cert || !key) {
    throw new Error("Teller mTLS credentials are not configured");
  }
  // @ts-ignore - cert/key supported in Deno runtime used by Supabase Edge Functions
  cachedClient = Deno.createHttpClient({ cert, key });
  return cachedClient;
}

export async function tellerFetch(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<Response> {
  const client = getTellerClient();
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Basic ${btoa(`${accessToken}:`)}`);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  // @ts-ignore - client is a Deno-specific RequestInit extension
  return fetch(`${TELLER_BASE}${path}`, { ...init, headers, client });
}

export async function tellerJson<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await tellerFetch(path, accessToken, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Teller ${path} failed (${res.status}): ${body}`);
  }
  return (await res.json()) as T;
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
