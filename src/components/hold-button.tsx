import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { ACTION_TYPE, BAR_TYPE, colors } from "@/constants/theme";

/** Same size as the arrows' icon box beside it, so the labels line up. */
const CIRCLE = ACTION_TYPE.icon;

/**
 * Press and hold to confirm. The whole button fills from the bottom up while
 * held — not just the circle, which the thumb doing the holding covers — and
 * drains back if you let go early. Used for leaving a workout, which ends the
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
  // The same progress across the whole button, visible either side of a thumb.
  const areaHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. Press and hold.`}
      onPressIn={start}
      onPressOut={cancel}
      style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 2 }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: areaHeight,
          backgroundColor: colors.bend,
          opacity: 0.3,
        }}
      />
      {/* Stands in for the tab bar's drop, so this label lines up with its neighbours'. */}
      <View style={{ height: 8 }} />
      <View
        style={{
          width: CIRCLE,
          height: CIRCLE,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          borderWidth: 1.5,
          borderColor: holding ? colors.bend : colors.line,
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
            backgroundColor: colors.bend,
          }}
        />
        <Icon name={icon} size={26} color={holding ? colors.ink : colors.muted} weight="semibold" />
      </View>

      <Text
        style={{
          color: holding ? colors.bend : colors.muted,
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
