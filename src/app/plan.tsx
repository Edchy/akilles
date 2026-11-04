import { useState } from "react";
import { ScrollView } from "react-native";
import { Text } from "@/components/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBarSpace } from "@/components/bottom-bar";
import { Catalogue } from "@/components/catalogue";
import { Modules } from "@/components/modules";
import { COLUMN } from "@/components/screen";
import { Segments } from "@/components/segments";
import { colors, fonts } from "@/constants/theme";


type Segment = "modules" | "exercises";

/**
 * Two views of the same thing: what your week is made of, and what it can be
 * made of. Kept on one tab because you rarely need the raw catalogue — but
 * kept as separate lists, since a program and a catalogue answer different
 * questions.
 */
export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const barSpace = useBarSpace();
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
        paddingBottom: barSpace + 28,
        gap: 22,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontFamily: fonts.display,
          fontSize: 48,
        }}
      >
        Plan
      </Text>

      <Segments
        options={[
          { value: "modules", label: "Workouts" },
          { value: "exercises", label: "Exercises" },
        ]}
        value={segment}
        onChange={setSegment}
      />

      {segment === "modules" ? <Modules onDragChange={setDragging} /> : <Catalogue />}
    </ScrollView>
  );
}
