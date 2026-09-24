import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable } from "react-native";

import { PRESSED, Slot } from "@/components/bottom-bar";
import type { IconName } from "@/components/icon";
import { colors } from "@/constants/theme";

/**
 * Press and hold to confirm. The slot fills from the bottom up while held,
 * and drains back if you let go early. Used for leaving a workout, which ends the
 * session: too consequential for a stray tap, not worth a dialog.
 */
export function HoldButton({
  icon,
  label,
  holdMs = 1000,
  onHold,
}: {
  icon: IconName;
  label: string;
  holdMs?: number;
  onHold: () => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const [holding, setHolding] = useState(false);
  // A plain timer decides when the hold completes. Deciding from the
  // animation's value is unreliable — the drain animation reports values too,
  // which fired the action on release.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => clear, []);

  const start = () => {
    clear();
    setHolding(true);
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: holdMs,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      progress.setValue(0);
      // Felt, not just seen: the thumb holding it covers the circle.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onHold();
    }, holdMs);
  };

  const cancel = () => {
    // Released early: nothing happens, and the fill drains away.
    clear();
    setHolding(false);
    progress.stopAnimation(() => {
      Animated.timing(progress, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    });
  };

  // A fraction, so the fill rises through the slot whatever its height.
  const fillHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. Press and hold.`}
      onPressIn={start}
      onPressOut={cancel}
      style={{ flex: 1 }}
    >
      {/* The same slot as Back and Skip beside it; only the red rising under
          a held thumb sets it apart. */}
      <Slot
        icon={icon}
        label={label}
        tint={colors.text}
        fill={holding ? PRESSED : undefined}
      >
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: fillHeight,
            backgroundColor: colors.bend,
          }}
        />
      </Slot>
    </Pressable>
  );
}
