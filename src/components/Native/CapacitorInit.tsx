"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      getPlatform: () => string;
    };
  }
}

export default function CapacitorInit() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.Capacitor?.isNativePlatform()) return;

    (async () => {
      const [
        { StatusBar, Style },
        { SplashScreen },
        { App },
        { Geolocation },
      ] = await Promise.all([
        import("@capacitor/status-bar"),
        import("@capacitor/splash-screen"),
        import("@capacitor/app"),
        import("@capacitor/geolocation"),
      ]);

      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#030712" });
      } catch {}

      try {
        await SplashScreen.hide({ fadeOutDuration: 200 });
      } catch {}

      // Pre-request location so navigator.geolocation calls in the dashboards
      // don't show the system prompt mid-interaction.
      try {
        const status = await Geolocation.checkPermissions();
        if (status.location !== "granted") {
          await Geolocation.requestPermissions({ permissions: ["location"] });
        }
      } catch {}

      App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          App.exitApp();
        }
      });
    })();
  }, []);

  return null;
}
