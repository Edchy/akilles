import * as Haptics from "expo-haptics";

/**
 * Klay's haptics, by meaning — so the phone says the same thing with the
 * same tap wherever it happens. Never for every touch: only where something
 * changed that you'd otherwise have to look to know.
 *
 * - tick: a choice moved or a threshold was crossed (a row will stay open, a
 *   dragged row found a new place, a segment changed).
 * - lift: something came off the page under your finger (hold to move).
 * - drop: it went down again.
 * - set: a set logged — a firm tap, the one you do most.
 * - done: a set or a workout counted.
 * - warn: something was taken away (removed, deleted), with Undo on screen.
 */
const quiet = (p: Promise<unknown>) => void p.catch(() => {});

export const haptic = {
  tick: () => quiet(Haptics.selectionAsync()),
  lift: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  drop: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  set: () => quiet(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  done: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warn: () => quiet(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};
