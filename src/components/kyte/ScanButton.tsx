import { useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ScanResult } from "@/lib/kyte/ocr";
import {
  capturePhoto,
  CameraPermissionError,
  CameraUnavailableError,
} from "@/lib/kyte/camera";
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
    if (busy) return;
    setBusy(true);
    let previewUrl: string | null = null;
    const scanToast = toast.loading("Opening camera…");
    try {
      const captured = await capturePhoto(isNative() ? source : "camera");
      if (!captured) {
        toast.dismiss(scanToast);
        return;
      }
      previewUrl = captured.previewUrl;
      toast.loading("Reading bill…", { id: scanToast });
      const { scanImage } = await import("@/lib/kyte/ocr");
      const result = await scanImage(captured.blob);
      toast.success(
        result.name || result.amount
          ? `Found ${result.name ?? "bill"}${result.amount ? ` · $${result.amount}` : ""}`
          : "Scan complete",
        { id: scanToast },
      );
      onResult(result);
    } catch (err) {
      if (err instanceof CameraPermissionError) {
        toast.error(err.message, { id: scanToast });
      } else if (err instanceof CameraUnavailableError) {
        toast.error("No camera available on this device.", { id: scanToast });
      } else {
        console.error("Scan failed", err);
        toast.error("Couldn't read that image. Try a clearer photo.", { id: scanToast });
      }
    } finally {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label="Scan a bill or card with the camera"
      aria-busy={busy}
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
