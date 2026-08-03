import { CORS_HEADERS, json, plaidJson, tokenFromBytea } from "../_shared/plaid.ts";
import { getUserClient, adminClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  try {
    const { userId } = await getUserClient(req);
    const { accountId } = await req.json();
    if (!accountId) return json({ error: "Missing accountId" }, 400);
    const admin = adminClient();
    const { data: account, error } = await admin.from("accounts")
      .select("id, plaid_item_id, access_token_encrypted")
      .eq("id", accountId).eq("user_id", userId).eq("provider", "plaid").maybeSingle();
    if (error) throw error;
    if (!account) return json({ error: "Not found" }, 404);
    const { count } = await admin.from("accounts").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("plaid_item_id", account.plaid_item_id);
    if ((count ?? 0) <= 1 && account.access_token_encrypted) {
      try {
        await plaidJson("/item/remove", { access_token: tokenFromBytea(account.access_token_encrypted) });
      } catch (error) {
        console.warn("Plaid item removal failed; deleting local link", error);
      }
    }
    const { error: deleteError } = await admin.from("accounts").delete().eq("id", accountId);
    if (deleteError) throw deleteError;
    return json({ ok: true });
  } catch (error) {
    console.error("plaid-disconnect error", error);
    return json({ error: (error as Error).message }, 500);
  }
});
