"use client";

import * as React from "react";

/**
 * Registers /sw.js once after first paint. Intentionally side-effect-only —
 * renders nothing. Mounted from the root layout so every page has the SW.
 *
 * Failures are swallowed: a missing or broken service worker should never
 * stop the app from rendering.
 */
export function ServiceWorkerRegistrar() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return; // skip during dev

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => console.warn("[pwa] service worker failed to register:", err));
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad, { once: true });
      return () => window.removeEventListener("load", onLoad);
    }
  }, []);

  return null;
}
