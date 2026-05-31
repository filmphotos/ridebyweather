"use client";

import { useEffect, useMemo, useState } from "react";
import { SERVICE_DEFS, statusFor, type Component, type Service } from "@/lib/serviceIntervals";

interface Stored {
  totalMi: number;
  services: Service[];
}

const STATUS_COLOR: Record<string, string> = {
  ok: "#22c55e",
  "due-soon": "#f59e0b",
  overdue: "#ef4444",
};

export default function MaintenanceClient() {
  const [totalMi, setTotalMi] = useState<number>(0);
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("rbw_maintenance");
      if (!raw) return;
      const s = JSON.parse(raw) as Stored;
      if (typeof s.totalMi === "number") setTotalMi(s.totalMi);
      if (Array.isArray(s.services)) setServices(s.services);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("rbw_maintenance", JSON.stringify({ totalMi, services }));
    } catch {}
  }, [totalMi, services]);

  const now = Date.now();

  const statuses = useMemo(
    () =>
      SERVICE_DEFS.map((def) => {
        const svc = services.find((s) => s.id === def.id) ?? {
          id: def.id,
          lastDoneMi: 0,
          lastDoneAt: now,
        };
        return statusFor(svc, totalMi, now, def);
      }),
    [services, totalMi, now]
  );

  const addMiles = (delta: number) => setTotalMi((m) => Math.max(0, m + delta));

  const markDone = (id: Component) => {
    setServices((prev) => {
      const others = prev.filter((s) => s.id !== id);
      return [...others, { id, lastDoneMi: totalMi, lastDoneAt: Date.now() }];
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Service Intervals</h1>
        <p className="mt-1 text-sm text-gray-400 max-w-xl">
          Track miles since each component was last serviced. Saved on this device. Push a ride
          when you finish — and tap done after a service.
        </p>
      </div>

      <div className="card mb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-500">Lifetime miles</div>
            <div className="mt-1 text-3xl font-bold text-white tabular-nums">{totalMi.toLocaleString()}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[5, 10, 20, 50].map((d) => (
              <button
                key={d}
                onClick={() => addMiles(d)}
                className="rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-sm font-medium text-sky-300 hover:bg-sky-500/20"
              >
                + {d} mi
              </button>
            ))}
            <input
              type="number"
              inputMode="numeric"
              placeholder="Set total"
              value={totalMi || ""}
              onChange={(e) => setTotalMi(Math.max(0, Number(e.target.value)))}
              className="w-28 rounded-lg border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {statuses.map((s) => (
          <div key={s.def.id} className="card flex items-center gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 text-xs font-bold tabular-nums"
              style={{ borderColor: STATUS_COLOR[s.status], color: STATUS_COLOR[s.status] }}
            >
              {Math.round(s.pctUsed * 100)}%
            </div>
            <div className="flex-1">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-white">{s.def.label}</h3>
                <span className="text-xs tabular-nums" style={{ color: STATUS_COLOR[s.status] }}>
                  {s.remaining}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${s.pctUsed * 100}%`, backgroundColor: STATUS_COLOR[s.status] }}
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-500">
                Interval: {s.def.intervalMiles ? `${s.def.intervalMiles} mi` : `${s.def.intervalDays} days`} · last done at {services.find((x) => x.id === s.def.id)?.lastDoneMi.toLocaleString() ?? 0} mi
              </p>
            </div>
            <button
              onClick={() => markDone(s.def.id)}
              className="rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-emerald-500/50 hover:text-emerald-300"
            >
              Mark done
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
