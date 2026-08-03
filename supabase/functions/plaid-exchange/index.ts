import { CORS_HEADERS, json, plaidJson, tokenToBytea } from "../_shared/plaid.ts";
import { getUserClient, adminClient } from "../_shared/auth.ts";

type PlaidAccount = {
  account_id: string;
  name: string;
  official_name?: string | null;
  mask?: string | null;
  type: string;
  subtype?: string | null;
  balances: { available?: number | null; current?: number | null; iso_currency_code?: string | null };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  try {
    const { userId } = await getUserClient(req);
    const { publicToken, institution } = await req.json();
    if (!publicToken) return json({ error: "Missing publicToken" }, 400);

    const exchanged = await plaidJson<{ access_token: string; item_id: string }>(
      "/item/public_token/exchange",
      { public_token: publicToken },
    );
    const accountResult = await plaidJson<{ accounts: PlaidAccount[] }>(
      "/accounts/balance/get",
      { access_token: exchanged.access_token },
    );
    const now = new Date().toISOString();
    const rows = accountResult.accounts.map((account) => ({
      user_id: userId,
      provider: "plaid",
      plaid_item_id: exchanged.item_id,
      plaid_account_id: account.account_id,
      institution: institution?.name ?? null,
      name: account.official_name ?? account.name,
      mask: account.mask ?? null,
      type: account.type,
      subtype: account.subtype ?? null,
      currency: account.balances.iso_currency_code ?? "USD",
      status: "active",
      access_token_encrypted: tokenToBytea(exchanged.access_token),
      balance_available: account.balances.available ?? null,
      balance_ledger: account.balances.current ?? null,
      balances_refreshed_at: now,
      linked_at: now,
    }));
    const { error } = await adminClient()
      .from("accounts")
      .upsert(rows, { onConflict: "user_id,plaid_account_id" });
    if (error) throw error;
    return json({ ok: true, count: rows.length });
  } catch (error) {
    console.error("plaid-exchange error", error);
    return json({ error: (error as Error).message }, 500);
  }
});
