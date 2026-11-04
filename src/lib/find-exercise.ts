import { PATTERN_LABEL, PATTERN_ORDER, groupOf, type Exercise } from "@/data/exercises";

/**
 * Finding an exercise by what you would call it. Add exercise's search box,
 * kept here so it can be tested without a screen.
 */

/** Lower case, letters and digits only: "Pull-ups" and "pullups" are one word. */
export const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** "Squats" finds Squat; "press" and "abs" stay as they are. */
const singular = (s: string) =>
  s.length >= 4 && s.endsWith("s") && !s.endsWith("ss") ? s.slice(0, -1) : s;

/** Within a family, presses together, then rows, and so on. */
export const byMovement = (a: Exercise, b: Exercise) =>
  PATTERN_ORDER.indexOf(a.patterns[0]) - PATTERN_ORDER.indexOf(b.patterns[0]);

/**
 * Everything that matches what was typed, best first: a name that starts
 * with it, then one that has it, then an other name (an alias), then the
 * muscle or movement — "chest" finds every chest exercise.
 */
export function searchExercises(all: Exercise[], typed: string): Exercise[] {
  const whole = singular(squash(typed));
  if (!whole) return [];
  const words = typed.split(/\s+/).map(squash).filter(Boolean).map(singular);
  const scored = all.flatMap((e) => {
    const name = squash(e.name);
    const aliases = (e.aliases ?? []).map(squash);
    const kinds = [...e.patterns.map((p) => squash(PATTERN_LABEL[p])), squash(groupOf(e))];
    const has = (hay: string[]) =>
      hay.some((h) => h.includes(whole)) || words.every((w) => hay.some((h) => h.includes(w)));
    const score = name.startsWith(whole)
      ? 0
      : has([name])
        ? 1
        : has(aliases)
          ? 2
          : has([name, ...aliases, ...kinds])
            ? 3
            : -1;
    return score < 0 ? [] : [{ e, score }];
  });
  return scored.sort((a, b) => a.score - b.score || byMovement(a.e, b.e)).map((x) => x.e);
}

/**
 * Already has this name, or one of its other names — give or take spaces,
 * case, hyphens and a plural: "pull ups" is the Pull-up.
 */
export const hasName = (all: Exercise[], typed: string) => {
  const want = singular(squash(typed));
  return (
    !!want &&
    all.some((e) => [e.name, ...(e.aliases ?? [])].some((n) => singular(squash(n)) === want))
  );
};
