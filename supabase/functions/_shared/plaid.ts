const PLAID_BASES: Record<string, string> = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
};

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

export async function plaidJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const clientId = Deno.env.get("PLAID_CLIENT_ID");
  const secret = Deno.env.get("PLAID_SECRET");
  const environment = Deno.env.get("PLAID_ENV") ?? "sandbox";
  const base = PLAID_BASES[environment];
  if (!clientId || !secret) throw new Error("Plaid credentials are not configured");
  if (!base) throw new Error(`Unsupported PLAID_ENV: ${environment}`);

  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, secret, ...body }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error_message ?? payload?.display_message ?? response.statusText;
    throw new Error(`Plaid ${path} failed (${response.status}): ${message}`);
  }
  return payload as T;
}

export function tokenToBytea(token: string): string {
  return `\\x${Array.from(new TextEncoder().encode(token))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function tokenFromBytea(value: unknown): string {
  if (value instanceof Uint8Array) return new TextDecoder().decode(value);
  if (typeof value !== "string") throw new Error("Stored Plaid token is invalid");
  const hex = value.startsWith("\\x") ? value.slice(2) : value;
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return value;
  const bytes = new Uint8Array(hex.match(/.{2}/g)!.map((part) => Number.parseInt(part, 16)));
  return new TextDecoder().decode(bytes);
}

export type PlaidTransaction = {
  transaction_id: string;
  account_id: string;
  date: string;
  name: string;
  merchant_name?: string | null;
  amount: number;
  iso_currency_code?: string | null;
  personal_finance_category?: { primary?: string | null; detailed?: string | null } | null;
};

export async function getTransactions(accessToken: string, accountId?: string, limit = 200) {
  let cursor: string | undefined;
  const transactions: PlaidTransaction[] = [];
  do {
    const page = await plaidJson<{
      added: PlaidTransaction[];
      modified: PlaidTransaction[];
      next_cursor: string;
      has_more: boolean;
    }>("/transactions/sync", {
      access_token: accessToken,
      cursor,
      count: Math.min(limit, 500),
    });
    transactions.push(
      ...[...page.added, ...page.modified].filter(
        (transaction) => !accountId || transaction.account_id === accountId,
      ),
    );
    cursor = page.next_cursor;
    if (!page.has_more || transactions.length >= limit) break;
  } while (cursor);
  return transactions.slice(0, limit);
}
