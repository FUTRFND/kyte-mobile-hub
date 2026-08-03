import { CORS_HEADERS, getTransactions, json, tokenFromBytea } from "../_shared/plaid.ts";
import { getUserClient, adminClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  try {
    const { userId } = await getUserClient(req);
    const url = new URL(req.url);
    const accountId = url.searchParams.get("account_id");
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "25"), 100);
    if (!accountId) return json({ error: "Missing account_id" }, 400);
    const { data: account, error } = await adminClient().from("accounts")
      .select("plaid_account_id, access_token_encrypted")
      .eq("id", accountId).eq("user_id", userId).eq("provider", "plaid").maybeSingle();
    if (error) throw error;
    if (!account?.plaid_account_id || !account.access_token_encrypted) {
      return json({ error: "Account not connected" }, 404);
    }
    const transactions = await getTransactions(
      tokenFromBytea(account.access_token_encrypted), account.plaid_account_id, limit,
    );
    return json({ transactions: transactions.map((transaction) => ({
      id: transaction.transaction_id,
      date: transaction.date,
      description: transaction.merchant_name ?? transaction.name,
      amount: -transaction.amount,
      currency: transaction.iso_currency_code ?? "USD",
      category: transaction.personal_finance_category?.primary ?? null,
    })) });
  } catch (error) {
    console.error("plaid-transactions error", error);
    return json({ error: (error as Error).message }, 500);
  }
});
