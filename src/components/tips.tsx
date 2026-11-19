import { useEffect, useState } from "react";
import { View, type ViewStyle } from "react-native";

import { Callout, CalloutSteps } from "@/components/hint";
import { seeTip, seenTip, useSession, type SessionState } from "@/store/session";

/**
 * First-time tips, shown the first time what they explain comes up, then
 * never again. They teach what the intro leaves out, at the moment it
 * matters, instead of all at once before the first workout.
 *
 * A gesture or a tap is shown, not told: a finger does it on the real thing,
 * with a few words beside it (`HINT_LABELS`, drawn by `GestureHint` in
 * `components/hint.tsx`). It plays a few times and goes; it may come back
 * once more next time, and once you have done the thing yourself it never
 * does. What needs words is a paper callout (`TIPS`), never black and with
 * no "Got it": in a workout a touch anywhere closes it, and it goes by itself
 * after a while; in Plan and the Library a small × closes it, and a long tip
 * is told one point at a time. Either way it counts as seen once it has shown.
 */
export const TIPS = {
  begin: "Do this one, fill in what you did, then swipe to the next card. Not today? Swipe now to skip it.",
  short: "Fewer than the number is fine. You'll try for the same again next time.",
  warmup: "Your first lift starts with a few lighter rounds. Tap “Warm up first” to see them.",
  library: "Every exercise is here. Change one here, and it changes in every workout that uses it.",
} as const;

/** The Plan tip, one point at a time. */
export const PLAN_STEPS = [
  "Your workouts take turns, top to bottom.",
  "Tap a workout to change it. Only that workout changes.",
  "Hold and drag to move one up or down.",
  "Swipe left on one to pause or delete it.",
] as const;

/** The words beside a finger hint: a few, never a sentence. */
export const HINT_LABELS = {
  swipe: "Done? Swipe to the next",
  overview: "All cards",
  menu: "Swap, how-to, note",
  rows: "Pause or delete",
} as const;

export type HintId = keyof typeof HINT_LABELS;
export type TipId = keyof typeof TIPS | "plan" | HintId;

export const isHint = (id: TipId): id is HintId => id in HINT_LABELS;

/** How long a callout in a workout stays before it goes by itself. */
const FLOAT_MS = 9000;

/** The first tip of these not seen yet, if any. */
export const firstUnseen = (state: SessionState, ids: (TipId | false | undefined)[]): TipId | undefined =>
  ids.find((id): id is TipId => !!id && !seenTip(state, id));

/**
 * A finger hint has played out by itself: the first time, it may come once
 * more another day; the second, it is done. Doing the thing marks it seen at
 * once (`seeTip`).
 */
export const playedHint = (state: SessionState, id: HintId): SessionState =>
  seenTip(state, `${id}:once`) ? seeTip(state, id) : seeTip(state, `${id}:once`);

/**
 * A callout over the top of the workout's card, on paper. There and gone,
 * never pushing anything: the deck closes it on any touch, and it goes by
 * itself after a while. Counts as seen once it has shown.
 */
export function FloatingTip({ id, top, side }: { id: keyof typeof TIPS | undefined; top: number; side: number }) {
  const { setState } = useSession();
  useEffect(() => {
    if (!id) return;
    const timer = setTimeout(() => setState((s) => seeTip(s, id)), FLOAT_MS);
    return () => clearTimeout(timer);
  }, [id, setState]);
  if (!id) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", top, left: side + 12, right: side + 12, zIndex: 50 }}>
      <Callout key={id} point="none">
        {TIPS[id]}
      </Callout>
    </View>
  );
}

/** A tip in the page, above what it explains, with a ×; once closed, it stays away. */
export function InlineTip({ id, style }: { id: "library" | "plan"; style?: ViewStyle }) {
  const { state, setState } = useSession();
  const [at, setAt] = useState(0);
  if (seenTip(state, id)) return null;
  const close = () => setState((s) => seeTip(s, id));
  if (id === "plan") {
    return (
      <Callout
        style={style}
        pointAt={0.18}
        onClose={close}
        foot={<CalloutSteps at={at} count={PLAN_STEPS.length} onNext={() => (at < PLAN_STEPS.length - 1 ? setAt(at + 1) : close())} />}
      >
        {PLAN_STEPS[at]}
      </Callout>
    );
  }
  return (
    <Callout style={style} point="none" onClose={close}>
      {TIPS[id]}
    </Callout>
  );
}
