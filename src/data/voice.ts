/**
 * Akilles talks back.
 *
 * The voice is cheeky and blunt about the lifting — never about the person.
 * It teases the bar, the reps and the heel; it does not call anyone weak.
 * Every line is paired on screen with the plain fact underneath, so the joke
 * can be skimmed past and nothing important lives only in the joke.
 */

export type Outcome = "hit" | "miss" | "drop";

/** After the last circle is filled: how that exercise went. */
export const OUTCOME_LINES: Record<Outcome, string[]> = {
  hit: [
    "Look at you.",
    "Easy? Then it's too light.",
    "Achilles would be proud. Mildly.",
    "The bar lost. Rematch — it's bringing friends.",
    "Clean. Suspiciously clean.",
    "Every rep. Who are you?",
    "Earned it. Now pay for it.",
    "You didn't flinch. Next time you will.",
    "Weakness left the building. Its heavier cousin is on the way.",
    "That's the minimum. Have a treat: more weight.",
  ],
  miss: [
    "So close. No excuses.",
    "The weight won. Rematch.",
    "Heel detected.",
    "Not quite. The bar remembers.",
    "Almost is a lovely word for didn't.",
    "You blinked.",
    "Ouch. We'll pretend that didn't happen. Once.",
    "The reps you missed are waiting for you.",
    "Denied. Come back and do it properly.",
    "That was the easy part.",
  ],
  drop: [
    "Twice? Don't make it a habit.",
    "The bar is winning the series.",
    "Ego check.",
    "Retreat is also a strategy.",
    "The weight has spoken.",
    "Step back to leap forward. Or just step back.",
    "Lighter. Build it back.",
    "Humbled. Happens to heroes too.",
  ],
};

/**
 * The Today screen, under the workout. Which list depends on where you are:
 * `{days}` and `{name}` are filled in where a line uses them.
 */
export const TODAY_LINES = {
  /** Nothing trained yet, ever. */
  first: [
    "Day one. Everyone's weak on day one.",
    "Fresh start. The bar doesn't know you yet.",
    "First one. Pick it up, put it down, repeat.",
    "New here? The app does the thinking. You do the lifting.",
  ],
  /** A week or more since the last session. */
  back: [
    "Oh, you're alive.",
    "{days} days. We counted.",
    "Long time no lift.",
    "Back from the dead. Welcome.",
    "The heel healed? Good. Back to work.",
    "Your gym membership sends its regards.",
    "The weights didn't go anywhere. Unlike you.",
  ],
  /** Already trained today — usually just finished. This one is for later. */
  again: [
    "Done for today. Go home.",
    "That's today sorted. Unless you're greedy.",
    "Trained already. Go eat something.",
    "Enough. Recovery is where it grows.",
  ],
  /** Any ordinary day. */
  regular: [
    "Go on then.",
    "The bar isn't going to lift itself.",
    "No thinking. Just lifting.",
    "You showed up. That's half. The other half is heavy.",
    "Get in. Lift. Get out.",
    "Leave before you hate it.",
    "It won't be fun. It'll be done.",
    "Warm up. Then stop warming up.",
    "Heels down. Ego too.",
    "Achilles didn't skip. Well. Mostly.",
    "Nobody's watching. Lift like they are.",
    "Today's excuse: none.",
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
 * One line from a list, chosen by a seed rather than at random, so the same
 * moment always says the same thing — going Back and forward again does not
 * reshuffle it — while the next exercise or session says something else.
 */
export const pickLine = (lines: readonly string[], seed: string): string => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return lines[Math.abs(h) % lines.length];
};
