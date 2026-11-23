
/**
 * Klay talks back.
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
 * has no list: exercise changes are shown alongside their weights.
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
    "The calf missed you. Start light.",
    "Your gym membership sends its regards.",
    "The weights waited. Start light and own them again.",
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

export type News = {
  up: { name: string; weight: string }[];
  fresh: { name: string; weight?: string }[];
  /** Same weight as last time, back two rungs to climb the top again. */
  reload: { name: string; weight: string }[];
  down: { name: string; weight: string }[];
};

/** The finished screen: how the whole session went. */
export const FINISHED_LINES = {
  // Turned the way "own the weight" turns it: falling short with good form
  // is the ego left at the door, so it gets the pride; a perfect sheet gets a
  // raised eyebrow — warm, but are you sure they were all slow?
  /** Every lift on target. */
  perfect: [
    "All on target. Slow on the way down, too? Then it goes up next time.",
    "Perfect, on paper. Your form knows the truth.",
    "Clean sweep. If any of them swung, take one back.",
    "Every rep counted. Every one controlled? Good.",
    "Flawless. Suspiciously flawless. Were they slow?",
    "Nothing missed. Next time, make it look this easy at a crawl.",
  ],
  /** Some hits, some misses. */
  mixed: [
    "Some short, all honest. That's the job.",
    "You counted the real ones. Most people don't.",
    "An honest six beats a sloppy eight. You just proved it.",
    "Fewer reps, all yours.",
    "Where it got hard, you stayed slow. That's the skill.",
    "Some owned, some not yet. Not yet is how it grows.",
  ],
  /** More misses than hits, or something dropped 10%. */
  rough: [
    "You stopped when the form did. That's the whole skill.",
    "The ego wanted more. You didn't give it any. Good.",
    "The weight won a few. Your form won the day.",
    "Lighter next time, and every rep yours. That's the plan working.",
    "Shaped a little more today. That's how it works.",
    "Hard and honest. Nothing better to bring home.",
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

/**
 * A goal's step. Learning a skill is slow and mostly not yet, so the voice
 * is patient with a short count — every session on the ladder is practice —
 * and saves its swagger for a step owned.
 */
export const GOAL_LINES = {
  /** Before anything is in, on a step not yet on target. */
  start: [
    "One rung at a time.",
    "Own this step. The goal comes after.",
    "Slow is smooth. Smooth is a handstand, eventually.",
    "Today's step, not the whole staircase.",
    "Skills are built, not found.",
  ],
  /** Before anything is in, with one session on target already. */
  once: ["Owned it once already.", "Once more on target and it's yours."],
  /** On target, the first of two. */
  hit: [
    "On target. Once more and it's yours.",
    "One clean session down.",
    "Good. Now do it again.",
    "Halfway to owning it.",
  ],
  /** Short of the target: the count starts again, the step stays. */
  miss: [
    "Not yet. That's what steps are for.",
    "Honest count. The step will wait.",
    "Skills come slowly, then all at once.",
    "Short today. Still practice.",
  ],
  /** Two sessions running, or practice you've got: the next step. */
  owned: [
    "Owned twice. Next rung.",
    "That one's yours now.",
    "Two in a row. Not luck.",
    "Step owned. The next one's nervous.",
    "Earned, not skipped to.",
  ],
  /** Practice you've got: your call, so it moves on today. */
  got: [
    "Your call. Good call.",
    "Got it. On to the next.",
    "Practice did its job.",
    "Easy now. That was the point.",
  ],
  /** The last step owned: the goal is learned. */
  learned: [
    "Learned. Go show someone.",
    "That's the whole ladder. Climbed.",
    "From the first rung to this. Yours.",
  ],
} as const;

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
