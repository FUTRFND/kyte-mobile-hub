// Shared Teller mTLS client helpers for Supabase Edge Functions.
// Uses Deno.createHttpClient to attach the Teller application certificate + private key.

const TELLER_BASE = "https://api.teller.io";

let cachedClient: Deno.HttpClient | null = null;

function normalizePem(raw: string, label: "CERTIFICATE" | "PRIVATE KEY"): string {
  let pem = raw.trim().replace(/^['"]|['"]$/g, "");
  // Convert common escaped newline forms into real newlines.
  pem = pem.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n");

  const begin = `-----BEGIN ${label}-----`;
  const end = `-----END ${label}-----`;

  // Some secret forms flatten PEMs into a single line, or keep markers on separate
  // lines but collapse the base64 body with spaces. Rebuild the PEM body whenever
  // both markers are present so Deno receives a canonical format.
  if (pem.includes(begin) && pem.includes(end)) {
    const start = pem.indexOf(begin) + begin.length;
    const finish = pem.indexOf(end, start);
    const body = pem.slice(start, finish).replace(/\s+/g, "");
    const lines = body.match(/.{1,64}/g) ?? [];
    pem = `${begin}\n${lines.join("\n")}\n${end}\n`;
  } else {
    // Fallback for secrets stored as raw base64 without PEM markers.
    const compact = pem.replace(/\s+/g, "");
    if (compact) {
      const lines = compact.match(/.{1,64}/g) ?? [];
      pem = `${begin}\n${lines.join("\n")}\n${end}\n`;
    }
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
