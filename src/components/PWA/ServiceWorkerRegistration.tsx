"use client";

import { useEffect } from "react";

// Registers the service worker on first load so the app meets PWA install
// criteria (controlled by an active SW with a fetch handler).
// Storm-alert push subscription is handled separately in StormAlertsToggle.
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (!window.isSecureContext) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // best-effort; install will simply not be offered
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
