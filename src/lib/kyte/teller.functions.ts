// Teller server-fn skeleton.
//
// These server functions are wired but inert until the user provides the
// Teller secrets (TELLER_APP_ID, TELLER_CERT, TELLER_CERT_KEY,
// TELLER_SIGNING_SECRET). When secrets are set, fill in the marked TODOs to
// call the Teller REST API with mTLS.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ExchangeInput = z.object({
  enrollment: z.object({
    accessToken: z.string().min(1),
    user: z.object({ id: z.string().optional() }).optional(),
    enrollment: z
      .object({ id: z.string().optional(), institution: z.object({ name: z.string() }).optional() })
      .optional(),
  }),
});

export const tellerExchange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ExchangeInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const appId = process.env.TELLER_APP_ID;
    if (!appId) {
      throw new Error(
        "Teller is not configured. Add TELLER_APP_ID, TELLER_CERT, TELLER_CERT_KEY, and TELLER_SIGNING_SECRET secrets.",
      );
    }

    // TODO: Use mTLS to call Teller GET /accounts with the access token + cert.
    // const accountsRes = await fetch("https://api.teller.io/accounts", {
    //   headers: { Authorization: "Basic " + btoa(`${data.enrollment.accessToken}:`) },
    //   // mTLS via Cloudflare connect-cert binding when configured
    // });
    // const tellerAccounts = await accountsRes.json();

    const institution =
      data.enrollment.enrollment?.institution?.name ?? "Linked account";

    const { data: row, error } = await supabase
      .from("accounts")
      .insert({
        user_id: userId,
        provider: "teller",
        institution,
        mask: null,
        status: "pending",
        // access_token_encrypted: pgsodium-encrypted on the server only
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    return { account_ids: [row.id], institution };
  });

export const tellerDelete = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ accountId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // TODO: revoke Teller enrollment via DELETE /accounts/:id before purging.
    const { error } = await supabase
      .from("accounts")
      .delete()
      .eq("id", data.accountId)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
