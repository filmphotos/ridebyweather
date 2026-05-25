"use client";

import { useEffect, useRef, useState } from "react";

// Holds a screen wake lock while `active` is true. Re-acquires after tab
// becomes visible again (browsers drop the lock on visibility change).
export function useWakeLock(active: boolean): { supported: boolean; held: boolean } {
  const [held, setHeld] = useState(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const supported = typeof navigator !== "undefined" && "wakeLock" in navigator;

  useEffect(() => {
    if (!supported) return;

    let cancelled = false;

    async function request() {
      try {
        const lock = await (navigator as Navigator & { wakeLock: { request: (t: "screen") => Promise<WakeLockSentinel> } })
          .wakeLock.request("screen");
        if (cancelled) {
          lock.release().catch(() => {});
          return;
        }
        sentinelRef.current = lock;
        setHeld(true);
        lock.addEventListener("release", () => setHeld(false));
      } catch {
        setHeld(false);
      }
    }

    async function release() {
      try {
        await sentinelRef.current?.release();
      } catch {}
      sentinelRef.current = null;
      setHeld(false);
    }

    function onVisible() {
      if (document.visibilityState === "visible" && active && !sentinelRef.current) {
        request();
      }
    }

    if (active) {
      request();
      document.addEventListener("visibilitychange", onVisible);
    } else {
      release();
    }

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      release();
    };
  }, [active, supported]);

  return { supported, held };
}

interface WakeLockSentinel extends EventTarget {
  release: () => Promise<void>;
}
