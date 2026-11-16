import { useEffect, useState } from "react";
import { Keyboard, Pressable, View } from "react-native";

import { useColors } from "@/components/field";
import { Text } from "@/components/text";
import { CardioInput } from "@/components/cardio-keyboard";
import { fonts } from "@/constants/theme";
import { CARDIO_MINUTES, defaultCourse, type CardioExercise, type CardioLength } from "@/data/conditioning";

/** The same two target choices in a session and in the saved plan. */
export function CardioTarget({ exercise, target, onChange }: {
  exercise: CardioExercise;
  target: CardioLength;
  onChange: (target: CardioLength) => void;
}) {
  const colors = useColors();
  const distance = target.course !== undefined;
  const value = target.course ?? target.minutes;
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [exercise.id, distance, value]);
  const counted = exercise.metric.unit === "skips" || exercise.metric.unit === "reps";
  const unit = distance ? exercise.metric.unit : "min";
  const parsed = Number(draft.replace(",", "."));
  const valid = draft.trim() !== "" && Number.isFinite(parsed) && parsed > 0 && (!distance || exercise.metric.decimals > 0 || Number.isInteger(parsed));

  return (
    <View style={{ gap: 12 }}>
      <View accessibilityRole="tablist" style={{ flexDirection: "row", borderRadius: 20, padding: 2, gap: 2, backgroundColor: colors.surface }}>
        {(["distance", "time"] as const).map((mode) => {
          const selected = distance === (mode === "distance");
          return (
            <Pressable key={mode} accessibilityRole="tab" accessibilityState={{ selected }}
              onPress={() => { Keyboard.dismiss(); if (!selected) onChange(mode === "distance" ? { course: defaultCourse(exercise) } : { minutes: CARDIO_MINUTES }); }}
              style={({ pressed }) => ({ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: selected ? colors.cloud : "transparent", opacity: pressed ? 0.7 : 1 })}>
              <Text style={{ color: selected ? colors.ink : colors.text, fontFamily: selected ? fonts.medium : fonts.regular, fontSize: 19 }}>
                {mode === "time" ? "Time" : counted ? "Reps" : "Distance"}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={{ color: colors.text, fontSize: 18 }}>{distance ? counted ? "Rep target" : "Distance target" : "Time target"}</Text>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
          <CardioInput value={draft} selectTextOnFocus keyboardType={distance && counted ? "number-pad" : "decimal-pad"}
            accessibilityLabel={`${distance ? counted ? "Rep" : "Distance" : "Time"} target in ${unit}`}
            onChangeText={(text) => {
              setDraft(text);
              const n = Number(text.trim().replace(",", "."));
              if (text.trim() && Number.isFinite(n) && n > 0 && (!distance || exercise.metric.decimals > 0 || Number.isInteger(n))) {
                onChange(distance ? { course: n } : { minutes: n });
              }
            }}
            onBlur={() => { if (!valid) setDraft(String(value)); }}
            style={{ minWidth: 74, maxWidth: 132, minHeight: 52, paddingHorizontal: 8, paddingVertical: 2, color: colors.text, fontFamily: fonts.medium, fontSize: 34, textAlign: "right", fontVariant: ["lining-nums"] }} />
          <Text style={{ color: colors.text, fontSize: 21 }}>{unit}</Text>
        </View>
      </View>
      {!valid ? <Text style={{ color: colors.text, fontSize: 16 }}>{counted && distance ? "Enter a whole number greater than zero." : "Enter a target greater than zero."}</Text> : null}
    </View>
  );
}

/** Shared picker vocabulary: cardio can use equipment, a rope, or just you. */
export function CardioChoices({ options, current, onPick }: {
  options: { id: string; name: string }[];
  current: string;
  onPick: (id: string) => void;
}) {
  const colors = useColors();
  return (
    <View>
      {options.map((exercise) => {
        const selected = exercise.id === current;
        return (
          <Pressable key={exercise.id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => onPick(exercise.id)}
            style={({ pressed }) => ({ minHeight: 56, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderColor: colors.line, opacity: pressed ? 0.6 : 1 })}>
            <Text style={{ flex: 1, color: colors.text, fontFamily: selected ? fonts.medium : fonts.regular, fontSize: 21 }}>{exercise.name}</Text>
            {selected ? <Text style={{ color: colors.muted, fontSize: 16 }}>Selected</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
