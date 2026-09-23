import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Catalogue } from "@/components/catalogue";
import { Modules } from "@/components/modules";
import { COLUMN } from "@/components/screen";
import { colors } from "@/constants/theme";

const serif = process.env.EXPO_OS === "ios" ? "Georgia" : "serif";

type Segment = "modules" | "exercises";

/**
 * Two views of the same thing: what your week is made of, and what it can be
 * made of. Kept on one tab because you rarely need the raw catalogue — but
 * kept as separate lists, since a program and a catalogue answer different
 * questions.
 */
export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState<Segment>("modules");
  // Frozen while a row is being dragged, or the drag would scroll the page too.
  const [dragging, setDragging] = useState(false);

  return (
    <ScrollView
      scrollEnabled={!dragging}
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 28,
        paddingHorizontal: 22,
        width: "100%",
        maxWidth: COLUMN,
        alignSelf: "center",
        paddingBottom: 28,
        gap: 22,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontFamily: serif,
          fontSize: 40,
          fontWeight: "700",
          letterSpacing: -1.5,
        }}
      >
        Plan
      </Text>

      <View
        style={{
          flexDirection: "row",
          gap: 4,
          borderRadius: 999,
          backgroundColor: colors.surface,
          padding: 4,
        }}
      >
        <Tab
          label="Workouts"
          active={segment === "modules"}
          onPress={() => setSegment("modules")}
        />
        <Tab
          label="Exercises"
          active={segment === "exercises"}
          onPress={() => setSegment("exercises")}
        />
      </View>

      {segment === "modules" ? <Modules onDragChange={setDragging} /> : <Catalogue />}
    </ScrollView>
  );
}

function Tab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 44,
        borderRadius: 999,
        backgroundColor: active ? colors.acid : "transparent",
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text
        style={{
          color: active ? colors.ink : colors.muted,
          fontSize: 14,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
