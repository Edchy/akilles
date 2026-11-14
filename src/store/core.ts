import {
  buildWorkout, currentPrescription, partnerPrescription, isLift, type SessionState,
} from "@/store/session";

/** The reset has one job: run the next workout's lifts. Never replace an active session. */
export function startCoreWorkout(state: SessionState): SessionState {
  if (state.active) return state;
  const built = buildWorkout(state);
  return {
    ...built,
    active: {
      ...built.active!,
      items: built.active!.items.filter(isLift).map((item) => ({ ...item, warmup: false })),
    },
  };
}

/** Explicit counts replace the old tap-to-count-down gesture. Zero is a valid attempted set. */
export function logCoreSet(state: SessionState, index: number, count: number, which: "main" | "partner" = "main"): SessionState {
  const active = state.active;
  const item = active?.items[active.cursor];
  const prescription = which === "main" ? currentPrescription(state) : partnerPrescription(state);
  const logged = which === "main" ? item?.logged : item?.supersetLogged;
  if (!active || !item || !prescription || !logged || !Number.isInteger(count) || count < 0 || count > 999 || !Number.isInteger(index) || index < 0 || index >= logged.length) return state;
  const first = logged[index] === null;
  return {
    ...state,
    active: {
      ...active,
      ...(first ? { lastSetAt: Date.now() } : {}),
      items: active.items.map((entry, i) => i === active.cursor
        ? { ...entry, skipped: false, [which === "main" ? "logged" : "supersetLogged"]: logged.map((value, j) => j === index ? count : value) }
        : entry),
    },
  };
}
