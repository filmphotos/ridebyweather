"use client";

// Web Bluetooth sensor hub for the live ride screen.
// Handles three independent connections, each best-effort and standards-based:
//   • Heart-rate strap  — standard Heart Rate Service (0x180D)
//   • Garmin Varia radar — Garmin's published radar service (custom 128-bit UUID)
//   • E-bike / power     — Battery Service (0x180F) + Cycling Power Service (0x1818)
//
// Web Bluetooth only exists in Chromium browsers over HTTPS (or localhost) and
// every connect() must be triggered by a user gesture. We declare the minimal
// slice of the API we use rather than depend on @types/web-bluetooth.

import { useCallback, useEffect, useRef, useState } from "react";

// --- minimal Web Bluetooth typings -------------------------------------------
type BluetoothServiceUUID = number | string;

interface BleCharacteristic extends EventTarget {
  value?: DataView;
  readValue(): Promise<DataView>;
  startNotifications(): Promise<BleCharacteristic>;
  stopNotifications(): Promise<BleCharacteristic>;
}
interface BleService {
  getCharacteristic(uuid: BluetoothServiceUUID): Promise<BleCharacteristic>;
}
interface BleServer {
  connected: boolean;
  connect(): Promise<BleServer>;
  disconnect(): void;
  getPrimaryService(uuid: BluetoothServiceUUID): Promise<BleService>;
}
interface BleDevice extends EventTarget {
  name?: string;
  gatt?: BleServer;
}
interface BleRequestOptions {
  filters?: Array<{ services?: BluetoothServiceUUID[]; namePrefix?: string }>;
  optionalServices?: BluetoothServiceUUID[];
  acceptAllDevices?: boolean;
}
interface BluetoothApi {
  requestDevice(options: BleRequestOptions): Promise<BleDevice>;
}

function getBluetooth(): BluetoothApi | null {
  if (typeof navigator === "undefined") return null;
  const bt = (navigator as Navigator & { bluetooth?: BluetoothApi }).bluetooth;
  return bt ?? null;
}

// --- service / characteristic UUIDs ------------------------------------------
const HEART_RATE_SERVICE = "heart_rate"; // 0x180D
const HEART_RATE_MEASUREMENT = "heart_rate_measurement"; // 0x2A37
const BATTERY_SERVICE = "battery_service"; // 0x180F
const BATTERY_LEVEL = "battery_level"; // 0x2A19
const CYCLING_POWER_SERVICE = "cycling_power"; // 0x1818
const CYCLING_POWER_MEASUREMENT = "cycling_power_measurement"; // 0x2A63
// Garmin Varia radar (published custom service).
const VARIA_RADAR_SERVICE = "6a4e3200-667b-11e3-949a-0800200c9a66";
const VARIA_RADAR_MEASUREMENT = "6a4e3203-667b-11e3-949a-0800200c9a66";

// --- public state shapes -----------------------------------------------------
export interface HeartRateState {
  connected: boolean;
  connecting: boolean;
  bpm: number | null;
  deviceName?: string;
}
export interface RadarThreat {
  id: number;
  distanceM: number; // meters to the approaching vehicle
}
export interface RadarState {
  connected: boolean;
  connecting: boolean;
  threats: RadarThreat[]; // nearest first; empty = all clear
  deviceName?: string;
}
export interface EbikeState {
  connected: boolean;
  connecting: boolean;
  batteryPct: number | null;
  powerW: number | null; // instantaneous power / motor output where exposed
  deviceName?: string;
}

export interface BleSensors {
  supported: boolean;
  error: string | null;
  hr: HeartRateState;
  radar: RadarState;
  ebike: EbikeState;
  connectHr: () => Promise<void>;
  connectRadar: () => Promise<void>;
  connectEbike: () => Promise<void>;
  disconnectHr: () => void;
  disconnectRadar: () => void;
  disconnectEbike: () => void;
}

// Heart Rate Measurement (0x2A37): flag bit0 = 16-bit value when set.
function parseHeartRate(dv: DataView): number | null {
  if (dv.byteLength < 2) return null;
  const flags = dv.getUint8(0);
  const bpm = flags & 0x1 ? dv.getUint16(1, true) : dv.getUint8(1);
  return bpm > 0 && bpm < 300 ? bpm : null;
}

// Cycling Power Measurement (0x2A63): uint16 flags, then sint16 instantaneous watts.
function parseCyclingPower(dv: DataView): number | null {
  if (dv.byteLength < 4) return null;
  const w = dv.getInt16(2, true);
  return Number.isFinite(w) ? w : null;
}

// Varia radar measurement — best-effort decode. Byte 0 is a rolling counter,
// then repeating 3-byte threat records: [threatId, distanceMeters, speed].
// Distance is the field we trust; we surface approaching vehicles by distance.
function parseRadarThreats(dv: DataView): RadarThreat[] {
  const out: RadarThreat[] = [];
  for (let i = 1; i + 1 < dv.byteLength; i += 3) {
    const id = dv.getUint8(i);
    const distanceM = dv.getUint8(i + 1);
    if (distanceM > 0) out.push({ id, distanceM });
  }
  return out.sort((a, b) => a.distanceM - b.distanceM);
}

const IDLE_HR: HeartRateState = { connected: false, connecting: false, bpm: null };
const IDLE_RADAR: RadarState = { connected: false, connecting: false, threats: [] };
const IDLE_EBIKE: EbikeState = { connected: false, connecting: false, batteryPct: null, powerW: null };

export function useBleSensors(): BleSensors {
  const [supported] = useState(() => !!getBluetooth());
  const [error, setError] = useState<string | null>(null);
  const [hr, setHr] = useState<HeartRateState>(IDLE_HR);
  const [radar, setRadar] = useState<RadarState>(IDLE_RADAR);
  const [ebike, setEbike] = useState<EbikeState>(IDLE_EBIKE);

  // Keep device handles so we can disconnect on unmount.
  const hrDeviceRef = useRef<BleDevice | null>(null);
  const radarDeviceRef = useRef<BleDevice | null>(null);
  const ebikeDeviceRef = useRef<BleDevice | null>(null);

  const reportError = useCallback((e: unknown) => {
    // User cancelling the chooser throws NotFoundError — not worth surfacing.
    const msg = e instanceof Error ? e.message : String(e);
    if (/cancel|user gesture|chooser/i.test(msg)) return;
    setError(msg);
  }, []);

  const connectHr = useCallback(async () => {
    const bt = getBluetooth();
    if (!bt) { setError("Bluetooth isn't available in this browser."); return; }
    setError(null);
    setHr((s) => ({ ...s, connecting: true }));
    try {
      const device = await bt.requestDevice({
        filters: [{ services: [HEART_RATE_SERVICE] }],
        optionalServices: [BATTERY_SERVICE],
      });
      hrDeviceRef.current = device;
      device.addEventListener("gattserverdisconnected", () =>
        setHr({ ...IDLE_HR, deviceName: device.name })
      );
      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService(HEART_RATE_SERVICE);
      const ch = await service.getCharacteristic(HEART_RATE_MEASUREMENT);
      ch.addEventListener("characteristicvaluechanged", (ev) => {
        const dv = (ev.target as BleCharacteristic).value;
        if (!dv) return;
        const bpm = parseHeartRate(dv);
        if (bpm != null) setHr((s) => ({ ...s, bpm }));
      });
      await ch.startNotifications();
      setHr({ connected: true, connecting: false, bpm: null, deviceName: device.name });
    } catch (e) {
      reportError(e);
      setHr(IDLE_HR);
    }
  }, [reportError]);

  const connectRadar = useCallback(async () => {
    const bt = getBluetooth();
    if (!bt) { setError("Bluetooth isn't available in this browser."); return; }
    setError(null);
    setRadar((s) => ({ ...s, connecting: true }));
    try {
      const device = await bt.requestDevice({
        filters: [{ services: [VARIA_RADAR_SERVICE] }],
        optionalServices: [VARIA_RADAR_SERVICE],
      });
      radarDeviceRef.current = device;
      device.addEventListener("gattserverdisconnected", () =>
        setRadar({ ...IDLE_RADAR, deviceName: device.name })
      );
      const server = await device.gatt!.connect();
      const service = await server.getPrimaryService(VARIA_RADAR_SERVICE);
      const ch = await service.getCharacteristic(VARIA_RADAR_MEASUREMENT);
      ch.addEventListener("characteristicvaluechanged", (ev) => {
        const dv = (ev.target as BleCharacteristic).value;
        if (!dv) return;
        setRadar((s) => ({ ...s, threats: parseRadarThreats(dv) }));
      });
      await ch.startNotifications();
      setRadar({ connected: true, connecting: false, threats: [], deviceName: device.name });
    } catch (e) {
      reportError(e);
      setRadar(IDLE_RADAR);
    }
  }, [reportError]);

  const connectEbike = useCallback(async () => {
    const bt = getBluetooth();
    if (!bt) { setError("Bluetooth isn't available in this browser."); return; }
    setError(null);
    setEbike((s) => ({ ...s, connecting: true }));
    try {
      const device = await bt.requestDevice({
        filters: [{ services: [CYCLING_POWER_SERVICE] }, { services: [BATTERY_SERVICE] }],
        optionalServices: [CYCLING_POWER_SERVICE, BATTERY_SERVICE],
      });
      ebikeDeviceRef.current = device;
      device.addEventListener("gattserverdisconnected", () =>
        setEbike({ ...IDLE_EBIKE, deviceName: device.name })
      );
      const server = await device.gatt!.connect();
      setEbike({ connected: true, connecting: false, batteryPct: null, powerW: null, deviceName: device.name });

      // Battery % — read once, then subscribe if the device supports notify.
      try {
        const batSvc = await server.getPrimaryService(BATTERY_SERVICE);
        const batCh = await batSvc.getCharacteristic(BATTERY_LEVEL);
        const v = await batCh.readValue();
        setEbike((s) => ({ ...s, batteryPct: v.getUint8(0) }));
        batCh.addEventListener("characteristicvaluechanged", (ev) => {
          const dv = (ev.target as BleCharacteristic).value;
          if (dv) setEbike((s) => ({ ...s, batteryPct: dv.getUint8(0) }));
        });
        await batCh.startNotifications().catch(() => {});
      } catch {
        // No standard battery service — many e-bikes keep this proprietary.
      }

      // Instantaneous power / motor output.
      try {
        const pwrSvc = await server.getPrimaryService(CYCLING_POWER_SERVICE);
        const pwrCh = await pwrSvc.getCharacteristic(CYCLING_POWER_MEASUREMENT);
        pwrCh.addEventListener("characteristicvaluechanged", (ev) => {
          const dv = (ev.target as BleCharacteristic).value;
          if (!dv) return;
          const w = parseCyclingPower(dv);
          if (w != null) setEbike((s) => ({ ...s, powerW: w }));
        });
        await pwrCh.startNotifications();
      } catch {
        // No standard power service exposed.
      }
    } catch (e) {
      reportError(e);
      setEbike(IDLE_EBIKE);
    }
  }, [reportError]);

  const disconnectHr = useCallback(() => {
    hrDeviceRef.current?.gatt?.disconnect();
    hrDeviceRef.current = null;
    setHr(IDLE_HR);
  }, []);
  const disconnectRadar = useCallback(() => {
    radarDeviceRef.current?.gatt?.disconnect();
    radarDeviceRef.current = null;
    setRadar(IDLE_RADAR);
  }, []);
  const disconnectEbike = useCallback(() => {
    ebikeDeviceRef.current?.gatt?.disconnect();
    ebikeDeviceRef.current = null;
    setEbike(IDLE_EBIKE);
  }, []);

  // Release every radio on unmount.
  useEffect(() => {
    return () => {
      hrDeviceRef.current?.gatt?.disconnect();
      radarDeviceRef.current?.gatt?.disconnect();
      ebikeDeviceRef.current?.gatt?.disconnect();
    };
  }, []);

  return {
    supported,
    error,
    hr,
    radar,
    ebike,
    connectHr,
    connectRadar,
    connectEbike,
    disconnectHr,
    disconnectRadar,
    disconnectEbike,
  };
}
