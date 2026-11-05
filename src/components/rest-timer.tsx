import { useEffect, useState } from "react";
import { AppState, View } from "react-native";
import { Text } from "@/components/text";

import { useColors } from "@/components/field";
import { Icon } from "@/components/icon";

/**
 * Past this, it is a break rather than a rest — a workout left and come back
 * to hours later read "Rest 318:38" — so the clock stops here and says so.
 */
const LONGEST_REST = 10 * 60;

/** Elapsed time since the last logged set, including time with the phone locked. */
export function RestTimer({ startedAt }: { startedAt?: number }) {
  const colors = useColors();
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (startedAt === undefined) return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      if (time - startedAt >= LONGEST_REST * 1000) stop();
    };
    let interval: ReturnType<typeof setInterval> | undefined;
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
      if (state === "active") start();
      else stop();
    });
    return () => {
      stop();
      subscription.remove();
    };
  }, [startedAt]);

  const elapsed = startedAt === undefined ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
  const long = elapsed >= LONGEST_REST;
  const minutes = Math.floor(Math.min(elapsed, LONGEST_REST) / 60);
  const seconds = long ? 0 : elapsed % 60;

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
    <Icon name="timer" size={17} color={colors.text} />
    <Text
      accessibilityLabel={startedAt === undefined
        ? "Rest timer starts after your first set"
        : long
          ? `More than ${LONGEST_REST / 60} minutes since your last set`
          : `Time since last set: ${minutes} minutes, ${seconds} seconds`}
      style={{
        color: colors.text,
        fontSize: 17,
        fontVariant: ["lining-nums", "tabular-nums"],
        textAlign: "right",
      }}
    >
      Rest {startedAt === undefined ? "—" : `${minutes}:${String(seconds).padStart(2, "0")}${long ? "+" : ""}`}
    </Text>
    </View>
  );
}
