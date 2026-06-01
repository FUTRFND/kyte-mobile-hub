// Smart bill detection: scans recent Teller transactions across all linked
// accounts for the user and surfaces recurring outflows that look like bills.
import { tellerJson, CORS_HEADERS, json } from "../_shared/teller.ts";
import { getUserClient, adminClient } from "../_shared/auth.ts";

type TellerTxn = {
  id: string;
  date: string;
  description: string;
  amount: string;
  details?: { category?: string | null };
};

type Suggestion = {
  key: string;
  name: string;
  amount: number;
  category: string;
  frequency: "monthly" | "weekly" | "biweekly" | "yearly";
  lastDate: string;
  nextDueDate: string;
  occurrences: number;
  confidence: number; // 0..1
  sampleDescription: string;
};

function normalizeName(desc: string): string {
  return desc
    .toUpperCase()
    .replace(/\d{2,}/g, " ")
    .replace(/[^A-Z ]+/g, " ")
    .replace(/\b(POS|PURCHASE|DEBIT|ACH|RECURRING|PAYMENT|AUTOPAY|XX+|CO|INC|LLC|LTD|USA|US)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function prettyName(desc: string): string {
  const cleaned = normalizeName(desc).toLowerCase();
  return cleaned
    .split(" ")
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ") || desc;
}

function guessCategory(name: string): string {
  const s = name.toLowerCase();
  if (/(netflix|spotify|hulu|disney|prime|apple|youtube|hbo|paramount)/.test(s)) return "Subscriptions";
  if (/(rent|mortgage|landlord|apartment)/.test(s)) return "Housing";
  if (/(electric|power|energy|gas|water|sewer|utility|utilities|comcast|xfinity|verizon|att|t-mobile|tmobile|sprint)/.test(s)) return "Utilities";
  if (/(insurance|geico|allstate|progressive|state farm)/.test(s)) return "Insurance";
  if (/(gym|fitness|peloton|equinox|planet)/.test(s)) return "Fitness";
  if (/(loan|credit|capital one|chase|amex|discover)/.test(s)) return "Debt";
  return "Other";
}

function detectFrequency(daysBetween: number[]): {
  freq: Suggestion["frequency"];
  confidence: number;
} | null {
  if (daysBetween.length < 1) return null;
  const avg = daysBetween.reduce((s, d) => s + d, 0) / daysBetween.length;
  const variance =
    daysBetween.reduce((s, d) => s + (d - avg) ** 2, 0) / daysBetween.length;
  const stdev = Math.sqrt(variance);
  const targets: Array<{ freq: Suggestion["frequency"]; days: number; tol: number }> = [
    { freq: "weekly", days: 7, tol: 2 },
    { freq: "biweekly", days: 14, tol: 3 },
    { freq: "monthly", days: 30, tol: 5 },
    { freq: "yearly", days: 365, tol: 20 },
  ];
  for (const t of targets) {
    if (Math.abs(avg - t.days) <= t.tol) {
      // tighter stdev → higher confidence
      const c = Math.max(0.4, Math.min(1, 1 - stdev / (t.days * 0.5)));
      return { freq: t.freq, confidence: c };
    }
  }
  return null;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  try {
    const { userId } = await getUserClient(req);
    const admin = adminClient();

    const { data: accts, error } = await admin
      .from("accounts")
      .select("id, teller_account_id, access_token_encrypted, name, institution")
      .eq("user_id", userId)
      .eq("provider", "teller")
      .eq("status", "linked");
    if (error) throw error;

    const allTxns: TellerTxn[] = [];
    for (const a of accts ?? []) {
      if (!a.teller_account_id || !a.access_token_encrypted) continue;
      try {
        const token = new TextDecoder().decode(
          a.access_token_encrypted as unknown as Uint8Array,
        );
        const txns = await tellerJson<TellerTxn[]>(
          `/accounts/${a.teller_account_id}/transactions?count=200`,
          token,
        );
        allTxns.push(...txns);
      } catch (e) {
        console.warn("teller fetch failed for account", a.id, e);
      }
    }

    // Also include local manual transactions so demo data feeds detection.
    const { data: localTxns } = await admin
      .from("transactions")
      .select("name, amount, occurred_on")
      .eq("user_id", userId)
      .order("occurred_on", { ascending: false })
      .limit(500);

    type Sample = { id: string; date: string; description: string; amount: number; category?: string | null };
    const samples: Sample[] = [
      ...allTxns.map((t) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: Number(t.amount),
        category: t.details?.category ?? null,
      })),
      ...(localTxns ?? []).map((t) => ({
        id: `local-${t.name}-${t.occurred_on}`,
        date: t.occurred_on as string,
        description: t.name as string,
        amount: -Math.abs(Number(t.amount)),
      })),
    ];

    // Bucket outflows by (normalized-name, rounded-amount-bucket)
    type Bucket = { name: string; entries: Sample[] };
    const buckets = new Map<string, Bucket>();
    for (const s of samples) {
      if (!isFinite(s.amount) || s.amount >= 0) continue; // outflows only
      const norm = normalizeName(s.description);
      if (!norm) continue;
      // Bucket amounts to within 5% so subscription price tweaks still group
      const amtBucket = Math.round(Math.abs(s.amount) * 20) / 20;
      const key = `${norm}|${amtBucket}`;
      let b = buckets.get(key);
      if (!b) {
        b = { name: norm, entries: [] };
        buckets.set(key, b);
      }
      b.entries.push(s);
    }

    // Exclude items the user already tracks as bills (by similar name).
    const { data: existing } = await admin
      .from("bills")
      .select("name")
      .eq("user_id", userId)
      .eq("is_archived", false);
    const existingNorms = new Set(
      (existing ?? []).map((b) => normalizeName(b.name as string)),
    );

    const suggestions: Suggestion[] = [];
    for (const [key, b] of buckets) {
      if (b.entries.length < 2) continue;
      if (existingNorms.has(b.name)) continue;
      const sorted = b.entries
        .slice()
        .sort((x, y) => x.date.localeCompare(y.date));
      const gaps: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        const a = new Date(sorted[i - 1].date).getTime();
        const c = new Date(sorted[i].date).getTime();
        gaps.push(Math.round((c - a) / 86_400_000));
      }
      const freq = detectFrequency(gaps);
      if (!freq) continue;
      const avgAmt =
        sorted.reduce((s, x) => s + Math.abs(x.amount), 0) / sorted.length;
      const last = sorted[sorted.length - 1].date;
      const stepDays =
        freq.freq === "weekly" ? 7 :
        freq.freq === "biweekly" ? 14 :
        freq.freq === "monthly" ? 30 :
        365;
      const pretty = prettyName(sorted[sorted.length - 1].description);
      suggestions.push({
        key,
        name: pretty,
        amount: Math.round(avgAmt * 100) / 100,
        category: guessCategory(pretty),
        frequency: freq.freq,
        lastDate: last,
        nextDueDate: addDays(last, stepDays),
        occurrences: sorted.length,
        confidence: Math.round(freq.confidence * 100) / 100,
        sampleDescription: sorted[sorted.length - 1].description,
      });
    }

    suggestions.sort(
      (a, b) =>
        b.confidence * b.occurrences - a.confidence * a.occurrences,
    );

    return json({ suggestions: suggestions.slice(0, 12) });
  } catch (e) {
    console.error("detect-bills error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
