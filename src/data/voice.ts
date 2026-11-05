import { inSentence } from "@/data/exercises";

/**
 * Akilles talks back.
 *
 * The voice is cheeky and blunt about the lifting — never about the person.
 * It teases momentum, swinging, bouncing and ego; it never teases a small
 * number, because lifting less with control is the whole point and is what
 * gets praised. An honest short count is respected, never mocked: mocking it
 * would teach people to swing the last rep up instead.
 *
 * Every line is paired on screen with the plain fact underneath, so the joke
 * can be skimmed past and nothing important lives only in the joke. Lines
 * after a lift share two short lines on screen, one on a superset: keep them
 * under about fifty characters.
 */

export type Outcome = "hit" | "miss" | "drop";

/**
 * Which list answers a lift. A hit that starts a reload, or finishes one,
 * gets its own: those are the moments the philosophy is easiest to say.
 */
export type Say = Outcome | "reload" | "owned";

/** After the last circle is filled: how that exercise went. */
export const OUTCOME_LINES: Record<Say, string[]> = {
  hit: [
    "Owned, not borrowed.",
    "Slow and clean. That's the flex.",
    "Tension feeds the muscle. Momentum feeds the ego.",
    "Felt every rep? Then every rep counted.",
    "Light enough to own. Heavy enough to grow.",
    "Control is the hard part. You did the hard part.",
    "The muscle can't read the plate. It felt that.",
    "Less weight, still stronger. That's doing it right.",
    "Clean reps. The ego is sulking.",
    "No swing, no bounce. Lovely.",
  ],
  miss: [
    "Honest count. The bar respects that.",
    "Six owned beats eight swung.",
    "You stopped when the form did. That's the skill.",
    "A clean miss beats a dirty rep.",
    "The reps you didn't cheat are the ones that count.",
    "Fewer, but cleaner. That's the job.",
    "The weight won the round. Your form didn't lose.",
    "No ego reps. Respect.",
  ],
  drop: [
    "Lighter. Now own it.",
    "Ego check. The muscle doesn't mind.",
    "Less weight, better reps. Not a step back.",
    "Lighter is how you get heavier.",
    "The plate gets smaller. The standard doesn't.",
    "That weight wrote cheques your form couldn't cash.",
    "Back off, lock in.",
  ],
  reload: [
    "You climbed. Now own it.",
    "Two steps up. Prove you own them.",
    "Heavy enough. Now make it boring.",
    "The weight stays. The standard goes up.",
    "Same weight, slower. That's where it sticks.",
    "The ego wants more. You get better.",
  ],
  owned: [
    "Owned. Now you've earned the next one.",
    "That weight is yours now. Up you go.",
    "Proved it twice. Add a little.",
    "That's what owning it looks like.",
    "Earned, not borrowed. Next plate.",
  ],
};

/**
 * The Today screen, under the workout. Which list depends on where you are:
 * `{days}` and `{name}` are filled in where a line uses them. An ordinary day
 * has no list: Today says something only when there is news (`newsLine`).
 */
export const TODAY_LINES = {
  /** Nothing trained yet, ever — so the one thing worth saying is how to pick. */
  first: [
    "Day one. Pick weights you can control, with two reps to spare. The app does the rest.",
    "Day one. Lighter than you think, two reps to spare. Own every one.",
    "Fresh start. Leave the ego at the door and two reps in the tank.",
  ],
  /** A week or more since the last session. */
  back: [
    "Oh, you're alive.",
    "{days} days. We counted.",
    "Long time no lift.",
    "Back from the dead. Start light.",
    "The heel healed? Good. Start light.",
    "Your gym membership sends its regards.",
    "The weights waited. Start light and own them again.",
  ],
  /** Already trained today — usually just finished. This one is for later. */
  again: [
    "Done for today. Go home.",
    "That's today sorted. Unless you're greedy.",
    "Trained already. Go eat something.",
    "Enough. Recovery is where it grows.",
    "Done. The muscle grows at home, not here.",
  ],
  /** Just skipped a workout — teased, never scolded. */
  skipped: [
    "Skipped {name}. Bold.",
    "{name} will remember this.",
    "Not today, {name}.",
    "{name} dodged. It'll keep.",
    "Skipped {name}. We'll say nothing. Loudly.",
  ],
} as const;

export type TodayMood = keyof typeof TODAY_LINES;

/** Fill a line's `{days}` and `{name}`. */
export const fillLine = (line: string, vars: { days?: number; name?: string }): string =>
  line.replace("{days}", String(vars.days ?? "")).replace("{name}", vars.name ?? "");

/**
 * What changed since you last did a workout's lifts, in Akilles' words. One
 * kind of news gets a voiced line; two or three are said plainly, one after
 * the other. `{name}` is the lift at the start of a sentence, `{lname}` the
 * same mid-sentence, `{count}` a number word.
 */
const NEWS_LINES = {
  up: [
    "{name} goes up to {weight}. Same slow reps.",
    "{name}: {weight} today. Heavier, not sloppier.",
    "{name} goes up to {weight}. Own it like the last one.",
  ],
  upMany: [
    "{count} lifts go up today. Same standard.",
    "{count} lifts heavier than last time. Keep them slow.",
  ],
  fresh: [
    "First go at the {lname}. Start lighter than you think.",
    "New today: the {lname}. Leave two reps in the tank.",
  ],
  freshMany: [
    "{count} lifts you haven't done. Start lighter than you think.",
    "{count} new lifts today. Leave two reps in the tank.",
  ],
  reload: [
    "{name} reloads today. Lighter is the flex.",
    "{name} reloads: {weight} again, slower. Own it.",
    "{name} reloads today. Same weight, more control.",
  ],
  reloadMany: [
    "{count} lifts reload today. Climb them again, slower.",
    "{count} lifts reload today. Lighter is the flex.",
  ],
  down: ["{name} drops to {weight}. Lighter, cleaner.", "{name} back to {weight}. A run-up, not a retreat."],
  downMany: ["{count} lifts drop back today. A run-up, not a retreat."],
} as const;

const PLAIN = {
  up: "{name} goes up to {weight}.",
  upMany: "{count} lifts go up.",
  fresh: "First go at the {lname}.",
  freshMany: "{count} lifts are new.",
  reload: "{name} reloads at {weight}.",
  reloadMany: "{count} lifts reload.",
  down: "{name} drops to {weight}.",
  downMany: "{count} lifts drop back.",
} as const;

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

export type News = {
  up: { name: string; weight: string }[];
  fresh: { name: string; weight?: string }[];
  /** Same weight as last time, back two rungs to climb the top again. */
  reload: { name: string; weight: string }[];
  down: { name: string; weight: string }[];
};

export const newsLine = (news: News, seed: string): string | null => {
  const kinds = (["up", "fresh", "reload", "down"] as const).filter((k) => news[k].length > 0);
  if (kinds.length === 0) return null;
  const say = (k: (typeof kinds)[number], voiced: boolean) => {
    const items = news[k];
    const key = (items.length === 1 ? k : `${k}Many`) as keyof typeof PLAIN;
    const line = voiced ? pickLine(NEWS_LINES[key], `${seed}:${k}`) : PLAIN[key];
    const one = items[0];
    return line
      .replace("{name}", one.name)
      .replace("{lname}", inSentence(one.name))
      .replace("{weight}", one.weight ?? "")
      .replace("{count}", WORDS[items.length] ?? String(items.length));
  };
  return kinds.length === 1 ? say(kinds[0], true) : kinds.map((k) => say(k, false)).join(" ");
};

/** The finished screen: how the whole session went. */
export const FINISHED_LINES = {
  /** Every lift on target. */
  perfect: [
    "Every rep owned. Nobody needed to see the number.",
    "All of it, all controlled. Go home.",
    "Clean sweep. The ego's furious. The muscles aren't.",
    "Flawless and slow. The best kind.",
    "Achilles, minus the heel.",
    "Nothing swung, nothing missed. Go eat.",
  ],
  /** Some hits, some misses. */
  mixed: [
    "Mostly good. Mostly.",
    "Some owned, some honest. Both count.",
    "Clean where it mattered. Come back.",
    "Every rep you counted was a real one. Good.",
    "Good enough to come back. Honest enough to grow.",
    "A draw. Rematch next time.",
  ],
  /** More misses than hits, or something dropped 10%. */
  rough: [
    "Rough one. You still showed up.",
    "Hard day, honest count. That's how this works.",
    "You stopped when the form did. That's a win.",
    "The weights won today. Your form didn't lose.",
    "Lighter next time. That's the plan working.",
    "Humbling. Come back anyway.",
  ],
  /** Left with lifts skipped or unfinished. */
  partial: [
    "Half a workout is still a workout.",
    "Cut it short. Fair.",
    "Left early. The rest will wait.",
    "Some is more than none.",
    "Short and not sweet. Still counts.",
  ],
  /** Nothing to score — only cardio, mobility or speed work. */
  done: ["Done. Go home.", "That's it. Shower.", "Finished. Go eat."],
} as const;

export type FinishedMood = keyof typeof FINISHED_LINES;

/** Skip pressed on a warm-up: Akilles refuses, once. */
export const WARMUP_SKIP_LINES = [
  "Achilles skipped his warm-up once. Ask him about his heel.",
  "Cold muscles, hot take.",
  "Skip the warm-up? Your tendons have filed a complaint.",
  "The bar can wait a minute. Can your shoulders?",
  "Straight in cold? Bold. The weight thanks you for the head start.",
  "Warm-ups are boring. So is physio.",
  "The light sets are where the form gets built. Indulge me.",
];

/**
 * One line from a list, chosen by a seed rather than at random, so the same
 * moment always says the same thing — going Back and forward again does not
 * reshuffle it — while the next exercise or session says something else.
 */
export const pickLine = (lines: readonly string[], seed: string): string => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return lines[Math.abs(h) % lines.length];
};
