## Goal

Produce a static `dist/index.html` + `dist/assets/` bundle that Capacitor can package into iOS/Android, while keeping auth, routing, and Lovable Cloud (Supabase) working. Remove the hot‑reload `server.url` from `capacitor.config.ts`.

## Approach

TanStack Start is SSR-first and emits a Cloudflare Worker, not an `index.html`. Rather than rip Start out of the Lovable preview (which would break the in-browser dev experience), I'll add a **parallel SPA build pipeline** that reuses the existing routes and Supabase client:

- Keep `vite.config.ts` (Lovable preview + TanStack Start) untouched so the in-app preview keeps working.
- Add `vite.config.mobile.ts` — a plain Vite + React SPA config that:
  - Uses `@tanstack/router-plugin/vite` (file-based routing, no Start/SSR).
  - Has a real `index.html` entry with `<div id="root">` and `<script type="module" src="/src/main.mobile.tsx">`.
  - Outputs to `dist/` with hashed assets.
- Add `src/main.mobile.tsx` — SPA bootstrap: creates the router with `createMemoryHistory`-free `createBrowserHistory`, mounts `<RouterProvider>` into `#root`, wraps with `QueryClientProvider`, and runs the existing Supabase `onAuthStateChange` wiring.
- Add `index.html` at project root for the SPA build.
- Strip SSR-only concerns from the mobile entry:
  - No `__root.tsx` `<html>/<head>/<body>` shell — use a `mobileRootRoute` that renders just `<Outlet />` and applies meta via `react-helmet`-free `document.title` set in `useEffect`.
  - Skip `start.ts`, `server.ts`, `auth-middleware`, `client.server.ts` — none are bundled into the SPA.
  - Server functions (`createServerFn`) are not called from any current route, so nothing to port. If any get added later, they'll need to become direct `supabase` client calls in the mobile build.

Routes stay in `src/routes/` and are shared between both builds. The router context (`{ queryClient }`) is identical.

## Capacitor

Final `capacitor.config.ts`:

```ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.kyte.mobile",
  appName: "Kyte",
  webDir: "dist",
  backgroundColor: "#0B0B0D",
  plugins: {
    SplashScreen: { launchAutoHide: true, backgroundColor: "#0B0B0D", showSpinner: false },
    StatusBar: { style: "DARK", backgroundColor: "#0B0B0D" },
  },
};

export default config;
```

No `server.url`, no `cleartext`. Supabase calls go straight from the device to the cloud over HTTPS using `VITE_SUPABASE_URL` baked in at build time.

## Build commands

Add to `package.json` scripts:

- `build:mobile` → `vite build --config vite.config.mobile.ts` (emits `dist/index.html` + `dist/assets/`).
- `cap:sync` → `bun run build:mobile && cap sync`.
- `cap:ios` → `bun run cap:sync && cap open ios`.
- `cap:android` → `bun run cap:sync && cap open android`.

First-time native setup (run once locally, not in this sandbox):
```
bun run build:mobile
npx cap add ios
npx cap add android
npx cap sync
```

## Files I will create / change

- **NEW** `index.html` — SPA entry shell, brand bg `#0B0B0D`, viewport-fit=cover, theme-color.
- **NEW** `vite.config.mobile.ts` — React + TanStack Router plugin, `base: "./"` (required for Capacitor's `file://` / `capacitor://` origin), `build.outDir: "dist"`.
- **NEW** `src/main.mobile.tsx` — SPA bootstrap with QueryClient + RouterProvider + Supabase auth listener.
- **NEW** `src/mobile-root.tsx` — minimal root layout (no `<html>` shell), wraps `<Outlet />` with error/notFound components ported from `__root.tsx`.
- **EDIT** `capacitor.config.ts` — drop `server.url`, set `webDir: "dist"`.
- **EDIT** `package.json` — add the mobile build scripts.
- **EDIT** `src/routes/login.tsx` (small) — OAuth `redirectTo` needs to use `window.location.origin` only in browser env (already client-only, will verify).

## Things explicitly NOT done

- Not removing TanStack Start from the project — the Lovable preview keeps using it. Two configs coexist.
- Not adding deep-link / URL-scheme handlers yet (`appUrlOpen`) — call out as a Sprint-2 follow-up if you want Apple/Google OAuth callbacks to return into the app.
- Not running `cap add ios/android` from the sandbox (requires Xcode / Android SDK on your machine).

## Verification

After the edits I will:
1. Run `bun run build:mobile` in the sandbox.
2. Confirm `dist/index.html` and `dist/assets/` exist.
3. `grep` the built JS for `VITE_SUPABASE_URL` to confirm Supabase is wired.
4. Confirm the Lovable preview (TanStack Start build) still boots unchanged.

Approve and I'll execute.
