"use client";

import { useEffect, useState } from "react";

type Status =
  | { kind: "loading" }
  | { kind: "unsupported"; reason: string }
  | { kind: "not-configured" }
  | { kind: "denied" }
  | { kind: "off" }
  | { kind: "on" };

export default function StormAlertsToggle() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [vapidKey, setVapidKey] = useState<string | null>(null);
  // Window alerts are a separate per-subscription toggle. We load the current
  // value from the server when we discover an existing subscription.
  const [windowAlerts, setWindowAlerts] = useState<boolean | null>(null);
  // Dusk reminder — same hydrate-from-server pattern.
  const [duskAlerts, setDuskAlerts] = useState<boolean | null>(null);
  const [duskOffsetMin, setDuskOffsetMin] = useState<number>(30);
  const [endpoint, setEndpoint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (typeof window === "undefined") return;

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setStatus({ kind: "unsupported", reason: "This browser doesn't support push notifications." });
        return;
      }
      if (!window.isSecureContext) {
        if (!cancelled) setStatus({ kind: "unsupported", reason: "Push requires HTTPS." });
        return;
      }

      const vapidRes = await fetch("/api/push/vapid").catch(() => null);
      if (!vapidRes || !vapidRes.ok) {
        if (!cancelled) setStatus({ kind: "not-configured" });
        return;
      }
      const vapid = await vapidRes.json().catch(() => null);
      if (!vapid?.publicKey) {
        if (!cancelled) setStatus({ kind: "not-configured" });
        return;
      }
      if (!cancelled) setVapidKey(vapid.publicKey);

      if (Notification.permission === "denied") {
        if (!cancelled) setStatus({ kind: "denied" });
        return;
      }

      const reg = await navigator.serviceWorker.getRegistration("/sw.js").catch(() => null);
      const sub = await reg?.pushManager.getSubscription().catch(() => null);
      if (!cancelled) setStatus({ kind: sub ? "on" : "off" });

      // Hydrate the window-alerts toggle from the server so it reflects the
      // user's saved preference rather than always defaulting to false.
      if (sub && !cancelled) {
        setEndpoint(sub.endpoint);
        try {
          const prefRes = await fetch(
            `/api/push/preferences?endpoint=${encodeURIComponent(sub.endpoint)}`
          );
          if (prefRes.ok) {
            const p = await prefRes.json();
            if (!cancelled) {
              setWindowAlerts(!!p.windowAlerts);
              setDuskAlerts(!!p.duskAlerts);
              if (typeof p.duskOffsetMin === "number") setDuskOffsetMin(p.duskOffsetMin);
            }
          }
        } catch {
          // ignore — UI just won't show a hydrated value
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    if (!vapidKey) return;
    setBusy(true);
    setMsg(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus({ kind: "denied" });
        return;
      }

      const location = await getCurrentLocation();
      if (!location) {
        setMsg({ kind: "err", text: "We need your location to monitor storms in your area." });
        return;
      }

      const reg =
        (await navigator.serviceWorker.getRegistration("/sw.js")) ||
        (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const subJson = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          lat: location.lat,
          lng: location.lng,
          locationName: location.name,
          userAgent: navigator.userAgent,
          windowAlerts: true,
        }),
      });
      if (!res.ok) throw new Error(`Subscribe failed: ${res.status}`);

      setStatus({ kind: "on" });
      setEndpoint(subJson.endpoint ?? null);
      setWindowAlerts(true);
      setMsg({
        kind: "ok",
        text: "Alerts on. You'll get storm warnings and a daily best-ride-window briefing.",
      });
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Could not enable alerts." });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus({ kind: "off" });
      setMsg({ kind: "ok", text: "Storm alerts off." });
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Could not disable alerts." });
    } finally {
      setBusy(false);
    }
  }

  async function toggleWindowAlerts(next: boolean) {
    if (!endpoint) return;
    setBusy(true);
    setMsg(null);
    // Optimistic update — flip back if the server says no.
    setWindowAlerts(next);
    try {
      const res = await fetch("/api/push/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, windowAlerts: next }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      setMsg({
        kind: "ok",
        text: next
          ? "Daily best-window briefing on. Expect a push each evening."
          : "Daily best-window briefing off.",
      });
    } catch (err) {
      setWindowAlerts(!next);
      setMsg({
        kind: "err",
        text: err instanceof Error ? err.message : "Could not update preference.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function toggleDuskAlerts(next: boolean) {
    if (!endpoint) return;
    setBusy(true);
    setMsg(null);
    setDuskAlerts(next);
    try {
      const res = await fetch("/api/push/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, duskAlerts: next }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      setMsg({
        kind: "ok",
        text: next ? `Dusk reminder on — ${duskOffsetMin} min before sunset.` : "Dusk reminder off.",
      });
    } catch (err) {
      setDuskAlerts(!next);
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Could not update preference." });
    } finally {
      setBusy(false);
    }
  }

  async function saveDuskOffset(next: number) {
    if (!endpoint) return;
    setDuskOffsetMin(next);
    try {
      await fetch("/api/push/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, duskOffsetMin: next }),
      });
    } catch {
      // ignore — UI shows the optimistic value
    }
  }

  async function sendTest() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Test failed");
      setMsg({
        kind: "ok",
        text: `Sent test to ${data.sent} device${data.sent === 1 ? "" : "s"}.`,
      });
    } catch (err) {
      setMsg({ kind: "err", text: err instanceof Error ? err.message : "Test failed." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-200 flex items-center gap-1.5">
            <span>Storm &amp; lightning alerts</span>
            <span aria-hidden>⚡</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Get a push notification on this device when a thunderstorm appears near you in the next few hours.
          </p>
          <StatusLine status={status} />
        </div>
        <ActionButton status={status} busy={busy} onEnable={enable} onDisable={disable} />
      </div>

      {status.kind === "on" && (
        <>
          <div className="mt-4 flex items-start justify-between gap-4 border-t border-gray-800 pt-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-200 flex items-center gap-1.5">
                <span>Daily ride-window briefing</span>
                <span aria-hidden>🚴</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Each evening, get the best 2-hour riding window for tomorrow with the predicted Ride Score.
              </p>
            </div>
            <label className="flex-shrink-0 inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={!!windowAlerts}
                onChange={(e) => toggleWindowAlerts(e.target.checked)}
                disabled={busy || windowAlerts === null}
              />
              <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sky-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500 peer-disabled:opacity-50" />
            </label>
          </div>

          <div className="mt-4 flex items-start justify-between gap-4 border-t border-gray-800 pt-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-200 flex items-center gap-1.5">
                <span>Pre-sunset lights reminder</span>
                <span aria-hidden>🔦</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                A push at <span className="text-gray-400 font-medium">{duskOffsetMin} min</span> before civil sunset — &quot;charge the lights, pack a layer.&quot;
              </p>
              {duskAlerts && (
                <div className="mt-2 inline-flex items-center gap-2 text-xs">
                  <span className="text-gray-500">Lead time:</span>
                  {[15, 30, 45, 60].map((m) => (
                    <button
                      key={m}
                      onClick={() => saveDuskOffset(m)}
                      className={`rounded-md border px-2 py-0.5 transition-colors ${
                        duskOffsetMin === m
                          ? "border-sky-500 bg-sky-500/15 text-sky-300"
                          : "border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700"
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              )}
            </div>
            <label className="flex-shrink-0 inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={!!duskAlerts}
                onChange={(e) => toggleDuskAlerts(e.target.checked)}
                disabled={busy || duskAlerts === null}
              />
              <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-sky-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500 peer-disabled:opacity-50" />
            </label>
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={sendTest}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-md border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-50 transition-colors"
            >
              Send test alert
            </button>
          </div>
        </>
      )}

      {msg && (
        <p className={`text-xs mt-2 ${msg.kind === "ok" ? "text-emerald-400" : "text-red-400"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

function StatusLine({ status }: { status: Status }) {
  if (status.kind === "unsupported")
    return <p className="text-xs text-amber-400 mt-1">{status.reason}</p>;
  if (status.kind === "not-configured")
    return <p className="text-xs text-amber-400 mt-1">Push isn't configured on this server yet.</p>;
  if (status.kind === "denied")
    return (
      <p className="text-xs text-red-400 mt-1">
        Notifications are blocked for this site. Enable them in your browser settings to turn alerts on.
      </p>
    );
  return null;
}

function ActionButton({
  status,
  busy,
  onEnable,
  onDisable,
}: {
  status: Status;
  busy: boolean;
  onEnable: () => void;
  onDisable: () => void;
}) {
  if (status.kind === "loading") {
    return <span className="text-xs text-gray-500">…</span>;
  }
  if (status.kind === "unsupported" || status.kind === "not-configured" || status.kind === "denied") {
    return (
      <button disabled className="text-sm px-4 py-1.5 rounded-lg border border-gray-800 text-gray-600 cursor-not-allowed">
        Unavailable
      </button>
    );
  }
  if (status.kind === "on") {
    return (
      <button
        onClick={onDisable}
        disabled={busy}
        className="flex-shrink-0 text-sm px-4 py-1.5 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-50 transition-colors"
      >
        {busy ? "…" : "Turn off"}
      </button>
    );
  }
  return (
    <button
      onClick={onEnable}
      disabled={busy}
      className="flex-shrink-0 text-sm px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium disabled:opacity-50 transition-colors"
    >
      {busy ? "…" : "Enable"}
    </button>
  );
}

interface Coords {
  lat: number;
  lng: number;
  name?: string;
}

function getCurrentLocation(): Promise<Coords | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  });
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}
