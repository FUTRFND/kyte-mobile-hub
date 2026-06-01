// Lightweight OCR scanner for bills / cards. Uses tesseract.js, lazy-loaded
// so the 6MB worker bundle never reaches the initial app load.

export type ScanResult = {
  rawText: string;
  name?: string;
  amount?: number;
};

/** Parse OCR text into a best-guess { name, amount }. */
export function parseScan(text: string): ScanResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Find amount: look for "$12.34", "12,345.67", "total 45.00"
  let amount: number | undefined;
  const amountRe = /(?:total|amount|due|balance|pay)\s*[:\-]?\s*\$?\s*([0-9]{1,3}(?:[,.\s][0-9]{3})*(?:[.,][0-9]{2}))/i;
  for (const l of lines) {
    const m = l.match(amountRe);
    if (m) {
      amount = Number(m[1].replace(/[,\s]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, ""));
      if (!Number.isFinite(amount)) amount = undefined;
      if (amount !== undefined) break;
    }
  }
  if (amount === undefined) {
    // Fallback: largest currency-looking number in the text.
    const all = text.match(/\$?\s*([0-9]+(?:[.,][0-9]{2}))/g) ?? [];
    const nums = all
      .map((s) => Number(s.replace(/[^0-9.]/g, "")))
      .filter((n) => Number.isFinite(n) && n > 0 && n < 1_000_000);
    if (nums.length) amount = Math.max(...nums);
  }

  // Guess name: longest mostly-alphabetic line in the first 5 lines.
  let name: string | undefined;
  const candidates = lines.slice(0, 6).filter((l) => /[a-z]/i.test(l) && l.length >= 3 && l.length < 40);
  candidates.sort((a, b) => {
    const score = (s: string) => s.replace(/[^a-z]/gi, "").length;
    return score(b) - score(a);
  });
  if (candidates[0]) {
    name = candidates[0]
      .replace(/[^a-z0-9 &'\-]/gi, "")
      .trim()
      .slice(0, 40);
    if (!name) name = undefined;
  }

  return { rawText: text, name, amount };
}

/** Run OCR on a File/Blob. Lazy-imports tesseract.js. */
export async function scanImage(file: File | Blob): Promise<ScanResult> {
  const { recognize } = await import("tesseract.js");
  const { data } = await recognize(file, "eng");
  return parseScan(data.text);
}
