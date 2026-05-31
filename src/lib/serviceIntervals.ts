// Sane default service intervals (miles) for a typical road/gravel/commuter bike.
// Tubeless sealant is a time interval, not mileage — kept here for completeness.

export type Component =
  | "chain"
  | "cassette"
  | "chainrings"
  | "brake-pads-rim"
  | "brake-pads-disc"
  | "tires"
  | "bar-tape"
  | "cables-housing"
  | "tubeless-sealant";

export interface ServiceDef {
  id: Component;
  label: string;
  intervalMiles: number;
  intervalDays?: number;
}

export const SERVICE_DEFS: ServiceDef[] = [
  { id: "chain", label: "Chain", intervalMiles: 2000 },
  { id: "cassette", label: "Cassette", intervalMiles: 6000 },
  { id: "chainrings", label: "Chainrings", intervalMiles: 10000 },
  { id: "brake-pads-rim", label: "Brake pads (rim)", intervalMiles: 2500 },
  { id: "brake-pads-disc", label: "Brake pads (disc)", intervalMiles: 1500 },
  { id: "tires", label: "Tires", intervalMiles: 3500 },
  { id: "bar-tape", label: "Bar tape", intervalMiles: 3000 },
  { id: "cables-housing", label: "Cables & housing", intervalMiles: 5000 },
  { id: "tubeless-sealant", label: "Tubeless sealant", intervalMiles: 0, intervalDays: 60 },
];

export interface Service {
  id: Component;
  lastDoneMi: number;
  lastDoneAt: number; // ms epoch
}

export type Status = "ok" | "due-soon" | "overdue";

export interface ServiceStatus {
  def: ServiceDef;
  status: Status;
  pctUsed: number;
  milesSince: number;
  daysSince: number;
  remaining: string;
}

export function statusFor(svc: Service, totalMi: number, now: number, def: ServiceDef): ServiceStatus {
  const milesSince = Math.max(0, totalMi - svc.lastDoneMi);
  const daysSince = Math.max(0, Math.floor((now - svc.lastDoneAt) / (24 * 3600 * 1000)));
  const interval = def.intervalMiles || (def.intervalDays ? def.intervalDays : 1);
  const used = def.intervalMiles
    ? milesSince / def.intervalMiles
    : daysSince / (def.intervalDays || 60);
  const pctUsed = Math.min(1, used);

  let status: Status = "ok";
  if (pctUsed >= 1) status = "overdue";
  else if (pctUsed >= 0.85) status = "due-soon";

  let remaining = "";
  if (def.intervalMiles) {
    const left = Math.max(0, def.intervalMiles - milesSince);
    remaining = pctUsed >= 1 ? `${milesSince - def.intervalMiles} mi past due` : `${left} mi left`;
  } else if (def.intervalDays) {
    const left = Math.max(0, def.intervalDays - daysSince);
    remaining = pctUsed >= 1 ? `${daysSince - def.intervalDays} days past due` : `${left} days left`;
  }
  void interval;

  return { def, status, pctUsed, milesSince, daysSince, remaining };
}
