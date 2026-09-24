/**
 * Results: what the session log says about you, as numbers worth reading.
 *
 * Everything here is read-only and derived from `state.log` (and, for where a
 * lift stands now, `state.history`) — nothing is stored, so there is no second
 * copy to drift out of date. Only good news is surfaced on purpose: a lift that
 * went backwards is still in Lifts and Sessions, but this screen exists to make
 * you see what the work has bought you.
 */

import { cardioById, courseLabel, distanceLabel, timeLabel } from "@/data/conditioning";
import { byId } from "@/data/exercises";
import { weightLabel } from "@/lib/warmup";
import type { LogEntry, SessionLog, SessionState } from "@/store/session";

type LiftEntry = Extract<LogEntry, { kind: "lift" }>;
type CardioEntry = Extract<LogEntry, { kind: "cardio" }>;

const DAY_MS = 86_400_000;
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (t: number) => {
  const d = new Date(t);
  return `${d.getDate()} ${MONTH[d.getMonth()]}`;
};

/** Monday 00:00 of the week `t` falls in, by calendar date. */
const weekOf = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
};

const lifts = (s: SessionLog) => s.entries.filter((e): e is LiftEntry => e.kind === "lift");
const done = (e: LiftEntry) => e.outcome !== "skipped" && e.reps.some((r) => r !== null);

// ---- total lifted ----

/**
 * Kilograms moved: load × reps over every logged set. Bodyweight and timed
 * work are left out — there is no honest number for them — and a dumbbell
 * pair counts both hands.
 */
export const totalLifted = (log: SessionLog[]): number => {
  let kg = 0;
  for (const s of log) {
    for (const e of lifts(s)) {
      const ex = byId(e.exerciseId);
      if (!ex || !done(e) || ex.bodyweight || ex.unloaded || ex.timed) continue;
      const load = e.weight * (ex.perHand ? 2 : 1);
      for (const r of e.reps) if (r !== null) kg += load * r;
    }
  }
  return kg;
};

/** Heavy things, lightest first, for putting a big number in proportion. */
const HEAVY: [one: string, many: string, kg: number][] = [
  ["a grand piano", "grand pianos", 450],
  ["a small car", "small cars", 1_200],
  ["an elephant", "elephants", 6_000],
  ["a double-decker bus", "double-decker buses", 12_000],
  ["a loaded lorry", "loaded lorries", 40_000],
  ["a blue whale", "blue whales", 150_000],
  ["a jumbo jet", "jumbo jets", 400_000],
];

/** "That's 2.4 elephants." — the biggest thing you have out-lifted. */
export const liftedLike = (kg: number): string => {
  if (kg < HEAVY[0][2]) return "Nearly a grand piano. Keep going.";
  const [one, many, each] = [...HEAVY].reverse().find(([, , w]) => kg >= w)!;
  const n = kg / each;
  if (n < 1.5) return `That's ${one}.`;
  return `That's ${n < 10 ? n.toFixed(1).replace(/\.0$/, "") : Math.floor(n)} ${many}.`;
};

// ---- turning up ----

/**
 * Weeks in a row with at least one session. A week you haven't trained in
 * *yet* doesn't break it — the streak runs to last week until Sunday is over.
 */
export const weekStreak = (log: SessionLog[], now = Date.now()): number => {
  const weeks = new Set(log.map((s) => weekOf(s.startedAt)));
  const cursor = new Date(weekOf(now));
  if (!weeks.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 7);
  let n = 0;
  while (weeks.has(cursor.getTime())) {
    n++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return n;
};

/** Sessions this calendar month and last, for the tile's comparison. */
export const monthSessions = (log: SessionLog[], now = Date.now()) => {
  const d = new Date(now);
  const thisStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const lastStart = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
  return {
    now: log.filter((s) => s.startedAt >= thisStart).length,
    before: log.filter((s) => s.startedAt >= lastStart && s.startedAt < thisStart).length,
  };
};

/**
 * Share of lifts that made their target over the last 30 days, and the 30
 * before that. Null where there was nothing to score.
 */
export const hitRate = (log: SessionLog[], now = Date.now()) => {
  const rate = (from: number, to: number) => {
    const scored = log
      .filter((s) => s.startedAt >= from && s.startedAt < to)
      .flatMap(lifts)
      .filter((e) => e.outcome === "hit" || e.outcome === "miss" || e.outcome === "drop");
    if (scored.length === 0) return null;
    return scored.filter((e) => e.outcome === "hit").length / scored.length;
  };
  return {
    now: rate(now - 30 * DAY_MS, now + 1),
    before: rate(now - 60 * DAY_MS, now - 30 * DAY_MS),
  };
};

// ---- getting stronger ----

export type Gain = {
  exerciseId: string;
  name: string;
  /** "+7.5 kg", "+5 kg per hand" or "10 kg less assist". */
  label: string;
  /** "since 12 Aug". */
  since: string;
  /** For ranking: the gain as a share of where it started. */
  relative: number;
};

/**
 * Each lift's working weight now against the first time the log saw it.
 * Compared within one rep scheme — a heavy day and a volume day sit at
 * different weights — and the better of the two is kept per exercise.
 */
export const strengthGains = (state: SessionState): Gain[] => {
  const first = new Map<string, { weight: number; at: number }>();
  for (const s of state.log) {
    for (const e of lifts(s)) {
      const k = `${e.exerciseId}:${e.scheme}`;
      if (done(e) && !first.has(k)) first.set(k, { weight: e.weight, at: s.startedAt });
    }
  }

  const best = new Map<string, Gain>();
  for (const [k, from] of first) {
    const now = state.history[k];
    const ex = byId(now?.exerciseId ?? "");
    if (!now || !ex || ex.unloaded) continue;
    const diff = now.weight - from.weight;
    if (diff <= 0) continue;
    const label =
      ex.assistable && now.weight <= 0
        ? `${diff} kg less assist`
        : `+${diff} kg${ex.perHand ? " per hand" : ""}`;
    const gain: Gain = {
      exerciseId: ex.id,
      name: ex.name,
      label,
      since: `since ${shortDate(from.at)}`,
      relative: diff / Math.max(Math.abs(from.weight), 1),
    };
    const had = best.get(ex.id);
    if (!had || gain.relative > had.relative) best.set(ex.id, gain);
  }
  return [...best.values()].sort((a, b) => b.relative - a.relative);
};

// ---- records ----

export type PersonalRecord = { exerciseId: string; name: string; weight: string; at: number; date: string };

/**
 * A heavier weight than you had ever done on that exercise before, in any
 * scheme. The first time an exercise appears is a starting point, not a
 * record. One per exercise — its standing record — newest first.
 */
export const records = (log: SessionLog[]): PersonalRecord[] => {
  const heaviest = new Map<string, number>();
  const found: PersonalRecord[] = [];
  for (const s of log) {
    for (const e of lifts(s)) {
      const ex = byId(e.exerciseId);
      if (!ex || !done(e) || ex.unloaded) continue;
      const prev = heaviest.get(e.exerciseId);
      if (prev !== undefined && e.weight > prev) {
        found.push({
          exerciseId: ex.id,
          name: ex.name,
          weight: weightLabel(ex, e.weight),
          at: s.startedAt,
          date: shortDate(s.startedAt),
        });
      }
      if (prev === undefined || e.weight > prev) heaviest.set(e.exerciseId, e.weight);
    }
  }
  const standing = new Map(found.map((r) => [r.exerciseId, r]));
  return [...standing.values()].sort((a, b) => b.at - a.at);
};

// ---- cardio ----

export type CardioGain = { key: string; name: string; label: string; since: string };

/**
 * Each machine and length: your best against your first go. Faster over a
 * course, further in the minutes.
 */
export const cardioGains = (log: SessionLog[]): CardioGain[] => {
  const runs = new Map<string, { first: CardioEntry; at: number; best: number }>();
  for (const s of log) {
    for (const e of s.entries) {
      if (e.kind !== "cardio") continue;
      const k = `${e.exerciseId}:${e.course ?? `${e.minutes}m`}`;
      const had = runs.get(k);
      const timed = e.course !== undefined;
      if (!had) runs.set(k, { first: e, at: s.startedAt, best: e.score });
      else had.best = timed ? Math.min(had.best, e.score) : Math.max(had.best, e.score);
    }
  }

  const out: CardioGain[] = [];
  for (const [k, { first, at, best }] of runs) {
    const machine = cardioById(first.exerciseId);
    if (!machine || best === first.score) continue;
    const timed = first.course !== undefined;
    const over = timed ? courseLabel(machine, first.course!) : `${first.minutes} min`;
    out.push({
      key: k,
      name: `${machine.name} ${over}`,
      label: timed
        ? `${first.score - best < 60 ? `${first.score - best} s` : timeLabel(first.score - best)} faster`
        : `${distanceLabel(machine, best - first.score)} further`,
      since: `than ${shortDate(at)}`,
    });
  }
  return out;
};
