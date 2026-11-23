import { useEffect, useState } from "react";
import { AppState, View } from "react-native";

import { useColors } from "@/components/field";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { fonts } from "@/constants/theme";

/**
 * Past this it is a break, not a rest — a workout left and come back to
 * later would read "Rest 318:38" — so the clock stops and says so.
 */
const LONGEST_REST = 10 * 60;

/** The clock's height, kept whether it shows or not, so it arriving moves nothing. */
export const REST_CLOCK_HEIGHT = 32;
const HEIGHT = REST_CLOCK_HEIGHT;

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * The time since your last set, counting up: "1:24". No target, no alarm —
 * how long to rest is yours to judge; this only saves you looking at a
 * watch. Counts from the set itself, so time with the phone locked counts
 * too. (Until 23 November 2026 it counted against a rest for the lift —
 * 2:30, 1:30 or 1:00 — and chimed when it was up; see `restSeconds`.)
 */
export function RestClock({ since }: { since: number | undefined }) {
  const colors = useColors();
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (since === undefined) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      if ((time - since) / 1000 >= LONGEST_REST) stop();
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
    const subscription = AppState.addEventListener("change", (state) => (state === "active" ? start() : stop()));
    return () => {
      stop();
      subscription.remove();
    };
  }, [since]);

  if (since === undefined) return null;
  const elapsed = Math.max(0, Math.floor((now - since) / 1000));
  const long = elapsed >= LONGEST_REST;

  return (
    <View
      accessible
      accessibilityLabel={
        long
          ? "More than ten minutes since your last set"
          : `${Math.floor(elapsed / 60)} minutes ${elapsed % 60} seconds since your last set`
      }
      style={{ height: HEIGHT, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
    >
      <Icon name="timer" size={22} color={colors.text} />
      <Text
        style={{
          color: colors.text,
          fontFamily: long ? fonts.medium : fonts.bold,
          fontSize: long ? 17 : 24,
          fontVariant: ["tabular-nums"],
        }}
      >
        {long ? "Over ten minutes" : clock(elapsed)}
      </Text>
    </View>
  );
}
