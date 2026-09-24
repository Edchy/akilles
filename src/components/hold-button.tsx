import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { barLabel } from "@/components/bottom-bar";
import { ACTION_TYPE, colors, radii, TAB_BAR_HEIGHT } from "@/constants/theme";

/** The same disc as Back and Skip beside it, so the three read as one row. */
const CIRCLE = ACTION_TYPE.circle;

/**
 * Press and hold to confirm. The circle fills from the bottom up while held,
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
      style={{
        flex: 1,
        height: TAB_BAR_HEIGHT,
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      <View
        style={{
          width: CIRCLE,
          height: CIRCLE,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.button,
          backgroundColor: colors.raised,
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
        <Icon
          name={icon}
          size={ACTION_TYPE.glyph}
          color={holding ? colors.ink : colors.text}
          weight="semibold"
        />
      </View>

      <Text style={[barLabel, { color: holding ? colors.bend : colors.muted }]}>{label}</Text>
    </Pressable>
  );
}
