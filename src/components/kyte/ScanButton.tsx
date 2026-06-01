import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { scanImage, type ScanResult } from "@/lib/kyte/ocr";
import { capturePhoto } from "@/lib/kyte/camera";
import { isNative } from "@/lib/kyte/native";

/**
 * Bill/card scan button. On native (Capacitor iOS/Android) opens the full
 * native camera with haptic feedback; on web opens the device camera via
 * <input capture="environment"> with a desktop fallback to the file picker.
 * Either way the captured image is OCR'd and { name, amount } reported back.
 */
export function ScanButton({
  onResult,
  className = "",
  source = "camera",
  label = "Scan",
}: {
  onResult: (r: ScanResult) => void;
  className?: string;
  source?: "camera" | "library" | "prompt";
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      const captured = await capturePhoto(isNative() ? source : "camera");
      if (!captured) return;
      try {
        const result = await scanImage(captured.blob);
        onResult(result);
      } finally {
        // Revoke object URLs we created on web; leave native webPaths alone.
        if (captured.previewUrl.startsWith("blob:")) {
          URL.revokeObjectURL(captured.previewUrl);
        }
      }
    } catch (err) {
      console.error("OCR failed", err);
      alert("Couldn't read that image. Try a clearer photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label="Scan a bill or card with the camera"
      className={`flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground transition active:scale-95 disabled:opacity-60 ${className}`}
    >
      {busy ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Reading…
        </>
      ) : (
        <>
          <Camera className="h-4 w-4" aria-hidden /> {label}
        </>
      )}
    </button>
  );
}
