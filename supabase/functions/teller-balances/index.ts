// Refresh balances for all of the user's Teller accounts.
import { tellerJson, CORS_HEADERS, json } from "../_shared/teller.ts";
import { getUserClient, adminClient } from "../_shared/auth.ts";

type TellerBalance = { available: string | null; ledger: string | null };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  try {
    const { userId } = await getUserClient(req);
    const admin = adminClient();
    const { data: accounts, error } = await admin
      .from("accounts")
      .select("id, teller_account_id, access_token_encrypted")
      .eq("user_id", userId)
      .eq("provider", "teller");
    if (error) throw error;

    const decoder = new TextDecoder();
    const updates = await Promise.all(
      (accounts ?? []).map(async (a) => {
        if (!a.teller_account_id || !a.access_token_encrypted) return null;
        const token = decoder.decode(a.access_token_encrypted as unknown as Uint8Array);
        try {
          const bal = await tellerJson<TellerBalance>(
            `/accounts/${a.teller_account_id}/balances`,
            token,
          );
          await admin
            .from("accounts")
            .update({
              balance_available: bal.available ? Number(bal.available) : null,
              balance_ledger: bal.ledger ? Number(bal.ledger) : null,
              balances_refreshed_at: new Date().toISOString(),
              status: "active",
            })
            .eq("id", a.id);
          return { id: a.id, ok: true };
        } catch (e) {
          console.warn("balance refresh failed", a.id, e);
          await admin.from("accounts").update({ status: "error" }).eq("id", a.id);
          return { id: a.id, ok: false };
        }
      }),
    );

    return json({ ok: true, results: updates.filter(Boolean) });
  } catch (e) {
    console.error("teller-balances error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
