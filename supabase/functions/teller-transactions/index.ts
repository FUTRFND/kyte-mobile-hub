// Fetch recent transactions for one Teller account (does not persist).
import { tellerJson, CORS_HEADERS, json } from "../_shared/teller.ts";
import { getUserClient, adminClient } from "../_shared/auth.ts";

type TellerTxn = {
  id: string;
  date: string;
  description: string;
  amount: string;
  details?: { category?: string | null };
  running_balance?: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  try {
    const { userId } = await getUserClient(req);
    const url = new URL(req.url);
    const accountId = url.searchParams.get("account_id");
    const limit = Number(url.searchParams.get("limit") ?? "25");
    if (!accountId) return json({ error: "Missing account_id" }, 400);

    const admin = adminClient();
    const { data: account, error } = await admin
      .from("accounts")
      .select("teller_account_id, access_token_encrypted")
      .eq("id", accountId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!account?.teller_account_id || !account.access_token_encrypted) {
      return json({ error: "Account not connected" }, 404);
    }

    const token = new TextDecoder().decode(account.access_token_encrypted as unknown as Uint8Array);
    const txns = await tellerJson<TellerTxn[]>(
      `/accounts/${account.teller_account_id}/transactions`,
      token,
    );

    return json({
      transactions: txns.slice(0, limit).map((t) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: Number(t.amount),
        category: t.details?.category ?? null,
      })),
    });
  } catch (e) {
    console.error("teller-transactions error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
