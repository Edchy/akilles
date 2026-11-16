import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Text } from "@/components/text";
import { spring } from "@/constants/motion";
import { colors, radii } from "@/constants/theme";
import { haptic } from "@/lib/haptics";
import { useReduceMotion } from "@/lib/use-reduce-motion";

/** One travelling selection, rather than disconnected buttons flashing on. */
export function Segments<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const [width, setWidth] = useState(0);
  const reduce = useReduceMotion();
  const x = useSharedValue(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const itemWidth = Math.max(0, (width - 8 - (options.length - 1) * 4) / options.length);
  useEffect(() => {
    const target = index * (itemWidth + 4);
    x.value = reduce || !width ? target : withSpring(target, spring.snappy);
  }, [index, itemWidth, width, reduce, x]);
  const selection = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: "row", gap: 4, borderRadius: radii.button + 2, backgroundColor: colors.surface, padding: 4 }}>
      {width > 0 ? <Animated.View pointerEvents="none" style={[{
        position: "absolute", top: 4, bottom: 4, left: 4, width: itemWidth,
        borderRadius: radii.button - 2, backgroundColor: colors.bg,
        boxShadow: "0 1px 3px rgba(19, 50, 91, 0.12)",
      }, selection]} /> : null}
      {options.map((o) => {
        const active = o.value === value;
        return <Pressable key={o.value} accessibilityRole="button" accessibilityState={{ selected: active }}
          onPress={() => { if (!active) { haptic.tick(); onChange(o.value); } }}
          style={({ pressed }) => ({ flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: radii.button - 2, opacity: pressed ? 0.7 : 1 })}>
          <Text style={{ color: active ? colors.text : colors.muted, fontSize: 15, fontWeight: active ? "600" : "400" }}>{o.label}</Text>
        </Pressable>;
      })}
    </View>
  );
}
