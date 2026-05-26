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
        }),
      });
      if (!res.ok) throw new Error(`Subscribe failed: ${res.status}`);

      setStatus({ kind: "on" });
      setMsg({ kind: "ok", text: "Storm alerts on. You'll get a push if lightning is in the area." });
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
