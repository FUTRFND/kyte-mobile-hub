import { isNative } from "@/lib/kyte/native";

export type CaptureSource = "camera" | "library" | "prompt";

export type CapturedImage = {
  /** Always a Blob suitable for passing to OCR / FormData. */
  blob: Blob;
  /** Object URL for preview; caller is responsible for revoking. */
  previewUrl: string;
  mimeType: string;
};

/**
 * Capture a photo using the native Capacitor camera when running on-device,
 * with a transparent fallback to a hidden <input type="file" capture="..."> on web.
 */
export async function capturePhoto(source: CaptureSource = "camera"): Promise<CapturedImage | null> {
  if (isNative()) {
    return captureNative(source);
  }
  return captureWeb(source);
}

async function captureNative(source: CaptureSource): Promise<CapturedImage | null> {
  try {
    const [{ Camera, CameraResultType, CameraSource }, haptics] = await Promise.all([
      import("@capacitor/camera"),
      import("@capacitor/haptics").catch(() => null),
    ]);

    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source:
        source === "library"
          ? CameraSource.Photos
          : source === "prompt"
          ? CameraSource.Prompt
          : CameraSource.Camera,
      correctOrientation: true,
      presentationStyle: "fullscreen",
      promptLabelHeader: "Scan bill",
      promptLabelPhoto: "Choose from photos",
      promptLabelPicture: "Take photo",
    });

    // Light haptic on successful capture — feels truly native.
    haptics?.Haptics?.impact({ style: haptics.ImpactStyle?.Light ?? "LIGHT" as never }).catch(() => {});

    if (!photo.webPath) return null;
    const res = await fetch(photo.webPath);
    const blob = await res.blob();
    return {
      blob,
      previewUrl: photo.webPath,
      mimeType: blob.type || (photo.format ? `image/${photo.format}` : "image/jpeg"),
    };
  } catch (err) {
    // User cancelled or permission denied — treat as no-op.
    if ((err as { message?: string })?.message?.toLowerCase().includes("cancel")) return null;
    console.warn("Native camera failed, falling back to web", err);
    return captureWeb(source);
  }
}

function captureWeb(source: CaptureSource): Promise<CapturedImage | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(null);
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (source === "camera") input.setAttribute("capture", "environment");
    input.style.display = "none";

    let settled = false;
    const finish = (result: CapturedImage | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(result);
    };

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) return finish(null);
      finish({
        blob: file,
        previewUrl: URL.createObjectURL(file),
        mimeType: file.type || "image/jpeg",
      });
    });
    // Cancellation has no reliable event in browsers; window focus is the best heuristic.
    window.addEventListener(
      "focus",
      () => {
        setTimeout(() => {
          if (!input.files || input.files.length === 0) finish(null);
        }, 500);
      },
      { once: true },
    );

    document.body.appendChild(input);
    input.click();
  });
}
