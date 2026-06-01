import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { scanImage, type ScanResult } from "@/lib/kyte/ocr";

/**
 * Bill/card scan button. Opens the device camera (or photo picker on desktop),
 * runs OCR, and reports back a parsed { name, amount }.
 */
export function ScanButton({
  onResult,
  className = "",
}: {
  onResult: (r: ScanResult) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const result = await scanImage(file);
      onResult(result);
    } catch (err) {
      console.error("OCR failed", err);
      alert("Couldn't read that image. Try a clearer photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
        aria-hidden
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Scan a bill or card with the camera"
        className={`flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground active:opacity-80 disabled:opacity-60 ${className}`}
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Reading…
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" aria-hidden /> Scan
          </>
        )}
      </button>
    </>
  );
}
