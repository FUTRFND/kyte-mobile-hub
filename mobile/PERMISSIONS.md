# Native Permissions Checklist

Run once after `npx cap add ios` / `npx cap add android`, then commit the
generated native projects. Capacitor does NOT auto-inject these strings —
without them iOS hard-crashes the first time the camera is opened and
Android silently denies access on API 23+.

## iOS — `ios/App/App/Info.plist`

Add inside the top-level `<dict>`:

```xml
<key>NSCameraUsageDescription</key>
<string>Kyte uses the camera to scan bills and receipts.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Kyte reads photos so you can import bills from your library.</string>
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Kyte can save scanned bills back to your photo library.</string>
```

## Android — `android/app/src/main/AndroidManifest.xml`

Inside `<manifest>` (siblings of `<application>`):

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

## Verify

After `npx cap sync`, install on a real device and tap **Scan** on the
Bills screen. iOS should present the system permission sheet exactly once;
Android should show the runtime prompt. A subsequent denial routes the
user through the in-app `CameraPermissionError` toast with an actionable
"Enable it in Settings" message.
