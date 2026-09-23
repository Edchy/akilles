import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";

import { BAR_TYPE, colors } from "@/constants/theme";

/** 44pt is the minimum touch target on both platforms. */
const CIRCLE = BAR_TYPE.icon;

/**
 * Press and hold to confirm. The circle fills from the bottom up while held;
 * let go early and it drains back. Used for leaving a workout, which ends the
 * session — too consequential for a stray tap, not worth a dialog.
 */
export function HoldButton({
  glyph,
  label,
  holdMs = 1000,
  onHold,
}: {
  glyph: string;
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

  const fillHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, CIRCLE],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. Press and hold.`}
      onPressIn={start}
      onPressOut={cancel}
      style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 6 }}
    >
      <View
        style={{
          width: CIRCLE,
          height: CIRCLE,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          borderWidth: 1.5,
          borderColor: holding ? colors.coral : colors.line,
          // Clips the rising fill to the circle.
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: fillHeight,
            backgroundColor: colors.coral,
          }}
        />
        <Text
          style={{
            color: holding ? colors.bg : colors.muted,
            fontSize: 26,
            fontWeight: "600",
          }}
        >
          {glyph}
        </Text>
      </View>

      <Text
        style={{
          color: holding ? colors.coral : colors.muted,
          fontSize: BAR_TYPE.label,
          fontWeight: "800",
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
