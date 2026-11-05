import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBarSpace } from "@/components/bottom-bar";
import { Catalogue } from "@/components/catalogue";
import { Goals } from "@/components/goals";
import { useOpenIntro } from "@/components/intro";
import { Modules } from "@/components/modules";
import { COLUMN } from "@/components/screen";
import { Segments } from "@/components/segments";
import { colors, fonts } from "@/constants/theme";


type Segment = "modules" | "exercises" | "goals";

/**
 * Two views of the same thing: what your week is made of, and what it can be
 * made of. Kept on one tab because you rarely need the raw catalogue — but
 * kept as separate lists, since a program and a catalogue answer different
 * questions. A third, Goals, holds what you are learning — skills you climb
 * to a step at a time, done inside the workouts you choose.
 */
export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const barSpace = useBarSpace();
  const [segment, setSegment] = useState<Segment>("modules");
  const openIntro = useOpenIntro();
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
        paddingBottom: barSpace + 28,
        gap: 22,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text
          style={{
            color: colors.text,
            fontFamily: fonts.display,
            fontSize: 48,
          }}
        >
          Plan
        </Text>
        {/* How it all fits together: the intro's six pages, again. Here
            because Plan is where you meet workouts, exercises and goals. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="How Milo works"
          onPress={openIntro}
          hitSlop={6}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text
            style={{
              color: colors.text,
              fontFamily: fonts.medium,
              fontSize: 24,
              lineHeight: 28,
            }}
          >
            ?
          </Text>
        </Pressable>
      </View>

      <Segments
        options={[
          { value: "modules", label: "Workouts" },
          { value: "exercises", label: "Exercises" },
          { value: "goals", label: "Goals" },
        ]}
        value={segment}
        onChange={setSegment}
      />

      {segment === "modules" ? (
        <Modules onDragChange={setDragging} />
      ) : segment === "goals" ? (
        <Goals />
      ) : (
        <Catalogue />
      )}
    </ScrollView>
  );
}
