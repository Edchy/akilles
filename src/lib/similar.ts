import type { Exercise } from "@/data/exercises";
import { needsOf, TWIN } from "@/data/kit";

/**
 * How close one exercise is to another of the same movement, for filling a
 * slot away from the gym: the nearest thing to what the plan says, not the
 * first thing on the list.
 *
 *   the same exercise                            BB bench press, itself
 *   its twin on other gear                       KB press ↔ DB shoulder press
 *   the same lift with other gear                BB bench press → DB bench press
 *                                                Incline BB press → Incline DB press
 *   then the more of the name they share         BB bench press → DB floor press
 *
 * Read from the names, which spell the gear out (BB, DB, KB, Machine,
 * Smith, Cable) and the variant (incline, floor, single-arm). A loaded lift
 * leans to a loaded one, a per-hand lift to a per-hand one, and a lift to
 * one on the same gear.
 */

/** The words that only say which gear: dropped, so what is left is the lift. */
const GEAR_WORDS = new Set([
  "bb", "db", "kb", "barbell", "barbells", "dumbbell", "dumbbells", "kettlebell", "kettlebells",
  "machine", "smith", "cable", "cables", "double", "band", "banded", "with", "a", "the",
]);

const liftWords = (ex: Exercise): Set<string> =>
  new Set(
    ex.name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, " ")
      .split(/[\s]+/)
      .filter((w) => w && !GEAR_WORDS.has(w)),
  );

const twins = (a: string, b: string) => TWIN[a] === b || TWIN[b] === a;

/** At or above this, the same lift on other gear (or its twin): BB bench and DB bench. */
export const SAME_LIFT = 100;

/** Higher is closer. Only meaningful between exercises of one movement. */
export const similarity = (to: Exercise, ex: Exercise): number => {
  if (ex.id === to.id) return 1000;
  if (twins(ex.id, to.id)) return 500;
  const a = liftWords(to);
  const b = liftWords(ex);
  const shared = [...a].filter((w) => b.has(w)).length;
  const all = new Set([...a, ...b]).size;
  const same = shared === a.size && shared === b.size ? 100 : 0;
  const overlap = all ? (shared / all) * 40 : 0;
  const loaded = !!ex.bodyweight === !!to.bodyweight ? 6 : 0;
  const hands = !!ex.perHand === !!to.perHand ? 2 : 0;
  // Between two equally close, the one on the same gear: DB bench → DB floor press, not KB.
  const gear = needsOf(ex)[0] === needsOf(to)[0] ? 3 : 0;
  return same + overlap + loaded + hands + gear;
};

/** Closest to `to` first; the order given breaks ties. */
export const closestFirst = (to: Exercise | undefined, list: Exercise[]): Exercise[] => {
  if (!to) return list;
  return list
    .map((ex, i) => ({ ex, i, score: similarity(to, ex) }))
    .sort((x, y) => y.score - x.score || x.i - y.i)
    .map((x) => x.ex);
};
