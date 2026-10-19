import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { SectionLabel } from "@/components/sheet";
import { colors } from "@/constants/theme";
import { lookup, nextWeight, setExerciseWeight, useSession } from "@/store/session";

/**
 * A typed weight in kg, or null while it is not one yet. Below zero only
 * where an assist machine makes that mean something.
 */
export const parseWeight = (text: string, negative = false): number | null => {
  const normalized = text.trim().replace(",", ".");
  const pattern = negative ? /^-?\d+(\.\d*)?$/ : /^\d+(\.\d*)?$/;
  return pattern.test(normalized) ? Number(normalized) : null;
};

/**
 * The weight an exercise opens at next time. Before any history it is where
 * the exercise starts; after, it moves the working weight. Saved as you type,
 * like everything else in these sheets — and a workout you stepped out of
 * picks it up on anything not yet started.
 */
export function WeightField({ exerciseId }: { exerciseId: string }) {
  const { state, setState } = useSession();
  const stored = nextWeight(state, exerciseId);
  const [text, setText] = useState(String(stored));
  const exercise = lookup(state, exerciseId);
  if (!exercise || exercise.unloaded) return null;

  const assisted = !!exercise.assistable;
  const valid = parseWeight(text, assisted) !== null;
  const trained = Object.values(state.history).some((r) => r.exerciseId === exerciseId);
  const perDumbbell = exercise.perHand ? ", per dumbbell" : "";
  const hint = exercise.bodyweight
    ? assisted
      ? "0 is bodyweight. Above adds weight; below is help from the assist machine."
      : "0 is bodyweight. Above adds weight."
    : trained
      ? `What it opens at next time${perDumbbell}.`
      : `Where it starts${perDumbbell}, until you have trained it.`;

  return (
    <View style={{ gap: 12 }}>
      <SectionLabel>{trained ? "Weight" : "Starting weight"}</SectionLabel>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TextInput
          value={text}
          onChangeText={(next) => {
            setText(next);
            const weight = parseWeight(next, assisted);
            if (weight !== null) setState((s) => setExerciseWeight(s, exerciseId, weight));
          }}
          onBlur={() => setText(String(stored))}
          // The decimal pad has no minus key.
          keyboardType={assisted ? "numbers-and-punctuation" : "decimal-pad"}
          selectTextOnFocus
          accessibilityLabel="Weight in kilograms"
          selectionColor={colors.text}
          style={{
            flex: 1,
            minHeight: 64,
            paddingHorizontal: 16,
            borderRadius: 16,
            backgroundColor: colors.surface,
            color: colors.text,
            fontSize: 24,
            fontWeight: "700",
          }}
        />
        <Text style={{ color: colors.muted, fontSize: 17 }}>
          {exercise.perHand ? "kg ×2" : "kg"}
        </Text>
      </View>
      <Text style={{ color: valid ? colors.muted : colors.bend, fontSize: 13, lineHeight: 19 }}>
        {valid
          ? `${hint} Changes save automatically.`
          : `Enter a weight in kg${assisted ? "" : ", 0 or more"}. The previous one is kept until then.`}
      </Text>
    </View>
  );
}
