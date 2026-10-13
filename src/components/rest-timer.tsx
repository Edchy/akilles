import { useEffect, useState } from "react";
import { AppState, Text } from "react-native";

import { colors } from "@/constants/theme";

/** Elapsed time since the last logged set, including time with the phone locked. */
export function RestTimer({ startedAt }: { startedAt?: number }) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    if (startedAt === undefined) return;
    const tick = () => setNow(Date.now());
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
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <Text
      accessibilityLabel={startedAt === undefined
        ? "Rest timer starts after your first set"
        : `Time since last set: ${minutes} minutes, ${seconds} seconds`}
      style={{
        color: colors.muted,
        fontSize: 17,
        fontWeight: "700",
        fontVariant: ["tabular-nums"],
        textAlign: "right",
      }}
    >
      Rest {startedAt === undefined ? "—" : `${minutes}:${String(seconds).padStart(2, "0")}`}
    </Text>
  );
}
