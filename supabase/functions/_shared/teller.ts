// Shared Teller mTLS client helpers for Supabase Edge Functions.
// Uses Deno.createHttpClient to attach the Teller application certificate + private key.

const TELLER_BASE = "https://api.teller.io";

let cachedClient: Deno.HttpClient | null = null;

function normalizePem(raw: string, label: "CERTIFICATE" | "PRIVATE KEY"): string {
  let pem = raw.trim();
  // Convert literal \n sequences into real newlines (common when pasted into form fields).
  if (pem.includes("\\n")) pem = pem.replace(/\\n/g, "\n");
  // If the markers are present but newlines were stripped, rebuild the PEM.
  const begin = `-----BEGIN ${label}-----`;
  const end = `-----END ${label}-----`;
  if (pem.includes(begin) && !pem.includes("\n")) {
    const body = pem.slice(pem.indexOf(begin) + begin.length, pem.indexOf(end)).replace(/\s+/g, "");
    const lines = body.match(/.{1,64}/g) ?? [];
    pem = `${begin}\n${lines.join("\n")}\n${end}\n`;
  }
  if (!pem.endsWith("\n")) pem += "\n";
  return pem;
}

function getTellerClient(): Deno.HttpClient {
  if (cachedClient) return cachedClient;
  const certRaw = Deno.env.get("TELLER_CERTIFICATE");
  const keyRaw = Deno.env.get("TELLER_PRIVATE_KEY");
  if (!certRaw || !keyRaw) {
    throw new Error("Teller mTLS credentials are not configured");
  }
  const cert = normalizePem(certRaw, "CERTIFICATE");
  const key = normalizePem(keyRaw, "PRIVATE KEY");
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
