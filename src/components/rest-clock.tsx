import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";

import { useColors } from "@/components/field";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { fonts } from "@/constants/theme";
import { cue } from "@/lib/chime";

/**
 * Past this it is a break, not a rest — a workout left and come back to
 * later would read "Rest 318:38" — so the clock stops and says so.
 */
const LONGEST_REST = 10 * 60;

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * The rest since your last set, against what this lift wants: "Rest 0:45 of
 * 2:30". When the time is up, a sound and a tap say "next set" — once — and
 * the clock says Ready. It never stops you starting sooner, or waiting
 * longer. Counts from the set itself, so time with the phone locked counts
 * too; the sound only plays with the app open.
 */
export function RestClock({ since, target }: { since: number | undefined; target: number }) {
  const colors = useColors();
  const [now, setNow] = useState(Date.now);
  // The set whose rest has been announced, so the sound plays once for it.
  const told = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (since === undefined) return;
    // Back to a rest already over — the phone was locked through it — is not news.
    if (Date.now() - since >= target * 1000) told.current = since;
    let interval: ReturnType<typeof setInterval> | undefined;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      const elapsed = (time - since) / 1000;
      if (elapsed >= target && told.current !== since) {
        told.current = since;
        cue("rest");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      if (elapsed >= LONGEST_REST) stop();
    };
    const stop = () => {
      clearInterval(interval);
      interval = undefined;
    };
    const start = () => {
      stop();
      tick();
      interval = setInterval(tick, 1000);
    };
    if (AppState.currentState === "active") start();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        // A rest that ran out while away is not announced late.
        if (Date.now() - since >= target * 1000) told.current = since;
        start();
      } else stop();
    });
    return () => {
      stop();
      subscription.remove();
    };
  }, [since, target]);

  if (since === undefined) return null;
  const elapsed = Math.max(0, Math.floor((now - since) / 1000));
  const ready = elapsed >= target;
  const long = elapsed >= LONGEST_REST;
  const label = long
    ? "Rested over ten minutes"
    : ready
      ? `Ready · rested ${clock(elapsed)}`
      : `Rest ${clock(elapsed)} of ${clock(target)}`;

  return (
    <View
      accessible
      accessibilityLiveRegion={ready ? "polite" : "none"}
      accessibilityLabel={
        long
          ? "More than ten minutes since your last set"
          : ready
            ? "Rest is over. Ready for the next set."
            : `Resting: ${Math.floor(elapsed / 60)} minutes ${elapsed % 60} seconds of ${Math.floor(target / 60)} minutes ${target % 60} seconds`
      }
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 28 }}
    >
      <Icon name="timer" size={17} color={colors.text} />
      <Text
        style={{
          color: colors.text,
          fontFamily: ready ? fonts.medium : fonts.regular,
          fontSize: 17,
          fontVariant: ["tabular-nums"],
        }}
      >
        {label}
      </Text>
    </View>
  );
}
