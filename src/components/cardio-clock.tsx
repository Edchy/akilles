import * as Haptics from "expo-haptics";
import { useEffect, useState, type ReactNode } from "react";
import { AppState, Pressable, View } from "react-native";

import { useColors } from "@/components/field";
import { Icon } from "@/components/icon";
import { Text } from "@/components/text";
import { fonts, radii } from "@/constants/theme";
import { cue } from "@/lib/chime";

const clockLabel = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/**
 * Cardio on the clock alone (see `onTheClock`): the minutes, counting down,
 * large — and one button under them that starts, pauses and carries on. At
 * zero a sound and a buzz say it's done, so the phone can stay on the
 * floor; the block is then done, with nothing to enter.
 *
 * The time lives in the workout (`Item.clock`), as an end time, so it keeps
 * running with the phone locked or the card swiped past. A clock that ran
 * out while away is done when you're back, without a late sound.
 */
export function CardioClock({
  minutes,
  clock,
  ran,
  onStart,
  onPause,
  onFinish,
  children,
}: {
  minutes: number;
  clock: { left: number; endAt: number | null } | undefined;
  ran: number | undefined;
  onStart: () => void;
  onPause: () => void;
  onFinish: () => void;
  /** Under the clock, above its button: how hard to go. */
  children?: ReactNode;
}) {
  const colors = useColors();
  const [now, setNow] = useState(Date.now);
  const endAt = clock?.endAt ?? null;

  useEffect(() => {
    if (!endAt) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const tick = (loud: boolean) => {
      const time = Date.now();
      setNow(time);
      if (time < endAt) return;
      stop();
      if (loud) {
        cue("finish");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      onFinish();
    };
    const stop = () => {
      clearInterval(interval);
      interval = undefined;
    };
    const start = (loud: boolean) => {
      stop();
      tick(loud);
      if (Date.now() < endAt) interval = setInterval(() => tick(true), 250);
    };
    // Back to a clock already over is not news: done, quietly.
    start(false);
    const subscription = AppState.addEventListener("change", (state) => (state === "active" ? start(false) : stop()));
    return () => {
      stop();
      subscription.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endAt]);

  const total = minutes * 60;
  const done = !!ran;
  const running = !!endAt;
  const left = done ? 0 : running ? Math.max(0, Math.ceil((endAt - now) / 1000)) : (clock?.left ?? total);
  const paused = !running && !done && left < total;
  const label = done ? "Done" : running ? "Pause" : paused ? "Carry on" : "Start";
  const spoken = `${Math.floor(left / 60)} minutes ${left % 60} seconds left`;

  return (
    <View style={{ alignItems: "center", gap: 18 }}>
      <Text
        accessibilityLabel={done ? `${minutes} minutes done` : spoken}
        accessibilityLiveRegion={done ? "polite" : "none"}
        style={{
          color: colors.text,
          fontFamily: fonts.display,
          fontSize: 88,
          lineHeight: 100,
          fontVariant: ["lining-nums", "tabular-nums"],
          opacity: running || done ? 1 : 0.85,
        }}
      >
        {clockLabel(left)}
      </Text>
      {children}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={done ? `${minutes} minutes done` : label}
        accessibilityState={{ disabled: done }}
        disabled={done}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          if (running) onPause();
          else {
            if (!paused) cue("start");
            onStart();
          }
        }}
        style={({ pressed }) => ({
          alignSelf: "stretch",
          minHeight: 72,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          borderRadius: radii.card,
          borderCurve: "continuous",
          backgroundColor: colors.surface,
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <Icon name={done ? "check" : running ? "pause" : "play"} size={22} color={colors.text} />
        <Text style={{ color: colors.text, fontFamily: fonts.medium, fontSize: 26 }}>
          {done ? `Done · ${minutes} min` : label}
        </Text>
      </Pressable>
    </View>
  );
}
