import { isNative, nativePluginsDisabledForDiagnostics } from "@/lib/kyte/native";

export type CaptureSource = "camera" | "library" | "prompt";

export type CapturedImage = {
  /** Always a Blob suitable for passing to OCR / FormData. */
  blob: Blob;
  /** Object URL or webPath for preview; caller should revoke blob: URLs. */
  previewUrl: string;
  mimeType: string;
};

export class CameraPermissionError extends Error {
  constructor(message = "Camera permission denied") {
    super(message);
    this.name = "CameraPermissionError";
  }
}
export class CameraUnavailableError extends Error {
  constructor(message = "Camera unavailable on this device") {
    super(message);
    this.name = "CameraUnavailableError";
  }
}

/**
 * Capture a photo using the native Capacitor camera when running on-device,
 * with a transparent fallback to a hidden <input type="file" capture="..."> on web.
 *
 * Returns `null` ONLY when the user cancelled. Throws typed errors for permission
 * or hardware problems so the UI can surface a helpful message.
 */
export async function capturePhoto(
  source: CaptureSource = "camera",
): Promise<CapturedImage | null> {
  if (isNative() && !nativePluginsDisabledForDiagnostics()) {
    return captureNative(source);
  }
  return captureWeb(source);
}

async function lightHaptic() {
  try {
    const h = await import("@capacitor/haptics");
    await h.Haptics?.impact({ style: h.ImpactStyle?.Light ?? ("LIGHT" as never) });
  } catch {
    // Haptics is best-effort.
  }
}

async function errorHaptic() {
  try {
    const h = await import("@capacitor/haptics");
    await h.Haptics?.notification?.({ type: h.NotificationType?.Warning ?? ("WARNING" as never) });
  } catch {
    // ignored
  }
}

async function captureNative(source: CaptureSource): Promise<CapturedImage | null> {
  let CameraMod: typeof import("@capacitor/camera");
  try {
    CameraMod = await import("@capacitor/camera");
  } catch (err) {
    console.warn("@capacitor/camera unavailable, falling back to web", err);
    return captureWeb(source);
  }
  const { Camera, CameraResultType, CameraSource } = CameraMod;

  // Explicit permission gate — surfaces the iOS/Android prompt up-front
  // and lets us throw a typed error instead of an opaque native exception.
  try {
    const status = await Camera.checkPermissions();
    const needsCamera = source !== "library" && status.camera !== "granted";
    const needsPhotos = source !== "camera" && status.photos !== "granted";
    if (needsCamera || needsPhotos) {
      const requested = await Camera.requestPermissions({
        permissions: [
          ...(needsCamera ? (["camera"] as const) : []),
          ...(needsPhotos ? (["photos"] as const) : []),
        ],
      });
      if (
        (needsCamera && requested.camera !== "granted") ||
        (needsPhotos && requested.photos !== "granted")
      ) {
        await errorHaptic();
        throw new CameraPermissionError(
          "Kyte needs camera access. Enable it in Settings to scan bills.",
        );
      }
    }
  } catch (err) {
    if (err instanceof CameraPermissionError) throw err;
    // checkPermissions throws on simulators without a camera — try the call anyway.
    console.warn("Permission check failed, attempting capture", err);
  }

  try {
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
      saveToGallery: false,
      presentationStyle: "fullscreen",
      promptLabelHeader: "Scan bill",
      promptLabelCancel: "Cancel",
      promptLabelPhoto: "Choose from photos",
      promptLabelPicture: "Take photo",
    });

    await lightHaptic();

    if (!photo.webPath) return null;
    const res = await fetch(photo.webPath);
    const blob = await res.blob();
    return {
      blob,
      previewUrl: photo.webPath,
      mimeType: blob.type || (photo.format ? `image/${photo.format}` : "image/jpeg"),
    };
  } catch (err) {
    const msg = (err as { message?: string })?.message?.toLowerCase() ?? "";
    // User cancelled — Capacitor surfaces these as thrown errors.
    if (msg.includes("cancel") || msg.includes("user denied")) return null;
    if (msg.includes("permission")) {
      await errorHaptic();
      throw new CameraPermissionError();
    }
    if (msg.includes("no camera") || msg.includes("unavailable")) {
      throw new CameraUnavailableError();
    }
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
