import { useEffect, useState } from "react";
import { Platform, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBarSpace } from "@/components/bottom-bar";
import { Catalogue } from "@/components/catalogue";
import { Goals } from "@/components/goals";
import { GOALS_ON } from "@/data/goals";
import { Modules } from "@/components/modules";
import { COLUMN } from "@/components/screen";
import { Segments } from "@/components/segments";
import { colors } from "@/constants/theme";


type Segment = "modules" | "exercises" | "goals";

/**
 * Two views of the same thing: what your week is made of, and what it can be
 * made of. Kept on one tab because you rarely need the raw catalogue — but
 * kept as separate lists, since a program and a catalogue answer different
 * questions. A third, Goals, holds what you are learning — skills you climb
 * to a step at a time, done inside the workouts you choose; it is put away
 * for now (see `GOALS_ON`).
 */
export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const barSpace = useBarSpace();
  const [segment, setSegment] = useState<Segment>("modules");
  // Frozen while a row is being dragged, or the drag would scroll the page too.
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const elements = [document.documentElement, document.body];
    const previous = elements.map((element) => element.style.overscrollBehaviorX);
    elements.forEach((element) => { element.style.overscrollBehaviorX = "none"; });
    return () => elements.forEach((element, index) => { element.style.overscrollBehaviorX = previous[index]; });
  }, []);

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
      <Segments
        options={[
          { value: "modules", label: "Workouts" },
          { value: "exercises", label: "Library" },
          ...(GOALS_ON ? [{ value: "goals" as const, label: "Goals" }] : []),
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
