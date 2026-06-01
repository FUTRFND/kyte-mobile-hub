// Disconnect a Teller-linked account: revoke the enrollment with Teller and delete the row.
import { tellerFetch, CORS_HEADERS, json } from "../_shared/teller.ts";
import { getUserClient, adminClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  try {
    const { userId } = await getUserClient(req);
    const { accountId } = await req.json();
    if (!accountId) return json({ error: "Missing accountId" }, 400);

    const admin = adminClient();
    const { data: account, error } = await admin
      .from("accounts")
      .select("id, access_token_encrypted")
      .eq("id", accountId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!account) return json({ error: "Not found" }, 404);

    if (account.access_token_encrypted) {
      const token = new TextDecoder().decode(
        account.access_token_encrypted as unknown as Uint8Array,
      );
      try {
        await tellerFetch("/accounts", token, { method: "DELETE" });
      } catch (e) {
        console.warn("teller revoke failed (continuing)", e);
      }
    }

    const { error: delErr } = await admin.from("accounts").delete().eq("id", accountId);
    if (delErr) throw delErr;
    return json({ ok: true });
  } catch (e) {
    console.error("teller-disconnect error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
