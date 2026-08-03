import { CORS_HEADERS, json, plaidJson, tokenFromBytea } from "../_shared/plaid.ts";
import { getUserClient, adminClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  try {
    const { userId } = await getUserClient(req);
    const admin = adminClient();
    const { data: accounts, error } = await admin
      .from("accounts")
      .select("id, plaid_item_id, plaid_account_id, access_token_encrypted")
      .eq("user_id", userId)
      .eq("provider", "plaid");
    if (error) throw error;

    const byItem = new Map<string, typeof accounts>();
    for (const account of accounts ?? []) {
      if (!account.plaid_item_id || !account.plaid_account_id || !account.access_token_encrypted) continue;
      byItem.set(account.plaid_item_id, [...(byItem.get(account.plaid_item_id) ?? []), account]);
    }
    const results = [];
    for (const itemAccounts of byItem.values()) {
      try {
        const accessToken = tokenFromBytea(itemAccounts[0].access_token_encrypted);
        const response = await plaidJson<{ accounts: Array<{ account_id: string; balances: { available?: number | null; current?: number | null; iso_currency_code?: string | null } }> }>(
          "/accounts/balance/get",
          { access_token: accessToken },
        );
        for (const remote of response.accounts) {
          const local = itemAccounts.find((account) => account.plaid_account_id === remote.account_id);
          if (!local) continue;
          await admin.from("accounts").update({
            balance_available: remote.balances.available ?? null,
            balance_ledger: remote.balances.current ?? null,
            currency: remote.balances.iso_currency_code ?? "USD",
            balances_refreshed_at: new Date().toISOString(),
            status: "active",
          }).eq("id", local.id);
          results.push({ id: local.id, ok: true });
        }
      } catch (error) {
        console.warn("Plaid balance refresh failed", error);
        for (const account of itemAccounts) {
          await admin.from("accounts").update({ status: "error" }).eq("id", account.id);
          results.push({ id: account.id, ok: false });
        }
      }
    }
    return json({ ok: true, results });
  } catch (error) {
    console.error("plaid-balances error", error);
    return json({ error: (error as Error).message }, 500);
  }
});
