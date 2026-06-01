// Exchange a Teller enrollment + access token for the list of accounts,
// store them in Supabase tied to the authenticated user.
import { tellerJson, CORS_HEADERS, json } from "../_shared/teller.ts";
import { getUserClient, adminClient } from "../_shared/auth.ts";

type TellerAccount = {
  id: string;
  name: string;
  institution: { name: string };
  last_four: string;
  type: string;
  subtype: string;
  currency: string;
  enrollment_id: string;
};

type TellerBalance = {
  available: string | null;
  ledger: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const { userId } = await getUserClient(req);
    const body = await req.json();
    const accessToken: string | undefined = body?.accessToken;
    const enrollment = body?.enrollment ?? {};
    if (!accessToken) return json({ error: "Missing accessToken" }, 400);

    const accounts = await tellerJson<TellerAccount[]>("/accounts", accessToken);

    // Fetch balances in parallel (best-effort).
    const balances = await Promise.all(
      accounts.map(async (a) => {
        try {
          return await tellerJson<TellerBalance>(`/accounts/${a.id}/balances`, accessToken);
        } catch {
          return null;
        }
      }),
    );

    const admin = adminClient();
    const rows = accounts.map((a, i) => ({
      user_id: userId,
      provider: "teller",
      teller_account_id: a.id,
      teller_enrollment_id: a.enrollment_id ?? enrollment?.id ?? null,
      institution: a.institution?.name ?? null,
      name: a.name,
      mask: a.last_four,
      type: a.type,
      subtype: a.subtype,
      currency: a.currency,
      status: "active",
      // Store the access token bytes in the existing bytea column.
      // Sandbox/dev only — production should encrypt with pgsodium or KMS.
      access_token_encrypted: new TextEncoder().encode(accessToken),
      balance_available: balances[i]?.available ? Number(balances[i]!.available) : null,
      balance_ledger: balances[i]?.ledger ? Number(balances[i]!.ledger) : null,
      balances_refreshed_at: new Date().toISOString(),
      linked_at: new Date().toISOString(),
    }));

    const { error } = await admin
      .from("accounts")
      .upsert(rows, { onConflict: "user_id,teller_account_id" });
    if (error) throw error;

    return json({ ok: true, count: rows.length });
  } catch (e) {
    console.error("teller-exchange error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
