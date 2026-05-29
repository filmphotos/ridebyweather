"use client";

// Eat / drink reminders for the live ride screen. Each reminder fires on a
// time OR distance interval while the activity is recording, with an on-screen
// banner plus best-effort vibration and a short beep.

import { useCallback, useEffect, useRef, useState } from "react";

export type ReminderKind = "drink" | "eat";
export type ReminderMode = "time" | "distance"; // minutes | miles

export interface ReminderRule {
  enabled: boolean;
  mode: ReminderMode;
  value: number; // minutes (time) or miles (distance)
}
export interface ReminderPrefs {
  drink: ReminderRule;
  eat: ReminderRule;
  sound: boolean;
}

export interface ActiveReminder {
  kind: ReminderKind;
  at: number;
}

const STORAGE_KEY = "rbw_reminders_v1";
const DISMISS_AFTER_MS = 25000;

const DEFAULTS: ReminderPrefs = {
  drink: { enabled: true, mode: "time", value: 15 },
  eat: { enabled: true, mode: "time", value: 45 },
  sound: true,
};

function loadPrefs(): ReminderPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<ReminderPrefs>;
    return {
      drink: { ...DEFAULTS.drink, ...p.drink },
      eat: { ...DEFAULTS.eat, ...p.eat },
      sound: p.sound ?? DEFAULTS.sound,
    };
  } catch {
    return DEFAULTS;
  }
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.12;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    osc.onended = () => ctx.close().catch(() => {});
  } catch {
    // audio blocked — the banner + vibration still fire
  }
}

export interface ActivityReminders {
  prefs: ReminderPrefs;
  setPrefs: (p: ReminderPrefs) => void;
  active: ActiveReminder | null;
  dismiss: () => void;
}

// `recording` gates firing; `elapsedSec` / `distMi` are the live accumulators.
export function useActivityReminders(
  recording: boolean,
  elapsedSec: number,
  distMi: number
): ActivityReminders {
  const [prefs, setPrefsState] = useState<ReminderPrefs>(DEFAULTS);
  const [active, setActive] = useState<ActiveReminder | null>(null);

  useEffect(() => {
    setPrefsState(loadPrefs());
  }, []);

  const setPrefs = useCallback((p: ReminderPrefs) => {
    setPrefsState(p);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {}
  }, []);

  // Baseline (elapsed/dist at last fire) per reminder, plus a sound ref so the
  // firing effect doesn't need `prefs.sound` in its dependency list.
  const drinkBase = useRef({ sec: 0, mi: 0 });
  const eatBase = useRef({ sec: 0, mi: 0 });
  const soundRef = useRef(prefs.sound);
  useEffect(() => { soundRef.current = prefs.sound; }, [prefs.sound]);

  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fire = useCallback((kind: ReminderKind) => {
    setActive({ kind, at: Date.now() });
    if (navigator.vibrate) navigator.vibrate([180, 90, 180]);
    if (soundRef.current) beep();
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => setActive(null), DISMISS_AFTER_MS);
  }, []);

  const dismiss = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setActive(null);
  }, []);

  // Reset baselines to "now" each time recording (re)starts so the first
  // reminder fires a full interval into the activity, not immediately.
  useEffect(() => {
    if (recording) {
      drinkBase.current = { sec: elapsedSec, mi: distMi };
      eatBase.current = { sec: elapsedSec, mi: distMi };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  // Check thresholds on every elapsed/distance change.
  useEffect(() => {
    if (!recording) return;
    const due = (rule: ReminderRule, base: { sec: number; mi: number }) =>
      rule.enabled &&
      (rule.mode === "time"
        ? elapsedSec - base.sec >= rule.value * 60
        : distMi - base.mi >= rule.value);

    if (due(prefs.drink, drinkBase.current)) {
      drinkBase.current = { sec: elapsedSec, mi: distMi };
      fire("drink");
    }
    if (due(prefs.eat, eatBase.current)) {
      eatBase.current = { sec: elapsedSec, mi: distMi };
      fire("eat");
    }
  }, [recording, elapsedSec, distMi, prefs.drink, prefs.eat, fire]);

  useEffect(() => () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); }, []);

  return { prefs, setPrefs, active, dismiss };
}
