import { CORS_HEADERS, json, plaidJson } from "../_shared/plaid.ts";
import { getUserClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  try {
    const { userId } = await getUserClient(req);
    const redirectUri = Deno.env.get("PLAID_REDIRECT_URI");
    const webhook = Deno.env.get("PLAID_WEBHOOK_URL");
    const response = await plaidJson<{ link_token: string; expiration: string }>(
      "/link/token/create",
      {
        client_name: "Kyte",
        language: "en",
        country_codes: ["US"],
        products: ["transactions"],
        user: { client_user_id: userId },
        ...(redirectUri ? { redirect_uri: redirectUri } : {}),
        ...(webhook ? { webhook } : {}),
      },
    );
    return json({ linkToken: response.link_token, expiration: response.expiration });
  } catch (error) {
    console.error("plaid-link-token error", error);
    return json({ error: (error as Error).message }, 500);
  }
});
