import { useState } from "react";
import { View } from "react-native";
import { useColors } from "@/components/field";
import { Text } from "@/components/text";
import { CardioInput } from "@/components/cardio-keyboard";
import { fonts } from "@/constants/theme";
import { distanceLabel, parseTime, timeLabel, type CardioExercise } from "@/data/conditioning";
import { cardioRecord, isTimed, scoreOf, type Item } from "@/store/session";

/** One result field: 5:30 and 530 both mean five minutes, thirty seconds. */
export function CardioResult({ cardio, item, record, onSet }: {
  cardio: CardioExercise;
  item: Item;
  record: ReturnType<typeof cardioRecord>;
  onSet: (score: number | null) => void;
}) {
  const colors = useColors();
  const timed = isTimed(item);
  const score = scoreOf(item);
  const counted = cardio.metric.unit === "skips" || cardio.metric.unit === "reps";
  const [draft, setDraft] = useState(score === null ? "" : timed ? timeLabel(score) : score.toFixed(cardio.metric.decimals));
  const parse = (text: string): number | null => {
    const value = timed ? parseTime(text) : text.trim() ? Number(text.replace(",", ".")) : null;
    return value !== null && Number.isFinite(value) && value > 0 && (timed || !counted || Number.isInteger(value)) ? value : null;
  };
  const invalid = draft.trim() !== "" && parse(draft) === null;
  const label = (value: number) => timed ? timeLabel(value) : distanceLabel(cardio, value);

  return (
    <View style={{ alignItems: "center", gap: 12 }}>
      <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 21 }}>
        {timed ? "Your time" : counted ? "Reps completed" : "Your distance"}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 10 }}>
        <CardioInput value={draft} placeholder={timed ? "0:00" : counted || cardio.metric.decimals === 0 ? "0" : "0.00"}
          placeholderTextColor={colors.dim} selectTextOnFocus keyboardType={timed ? "numbers-and-punctuation" : counted ? "number-pad" : "decimal-pad"}
          returnKeyType="done" submitBehavior="blurAndSubmit" accessibilityLabel={timed ? "Your time, minutes and seconds" : `Result in ${cardio.metric.unit}`}
          onChangeText={(text) => { setDraft(text); onSet(parse(text)); }}
          onBlur={() => { const value = parse(draft); if (value !== null) setDraft(timed ? timeLabel(value) : value.toFixed(cardio.metric.decimals)); }}
          style={{ width: timed ? 220 : 170, minHeight: 80, paddingVertical: 0, paddingHorizontal: 4, color: colors.text, fontFamily: fonts.medium, fontSize: 64, fontVariant: ["lining-nums", "tabular-nums"], textAlign: "center" }} />
        {!timed ? <Text style={{ color: colors.text, fontSize: 21 }}>{cardio.metric.unit}</Text> : null}
      </View>
      {invalid ? <Text style={{ color: colors.text, fontSize: 16, textAlign: "center" }}>
        {timed ? "Enter a valid time." : "Enter a result greater than zero."}
      </Text> : null}
      {record ? (
        <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 19, textAlign: "center" }}>
          Last time: {label(record.last)}
          <Text style={{ fontFamily: fonts.italic, fontSize: 17 }}>
            {` · ${timed ? "Fastest" : counted ? "Most reps" : "Furthest"}: ${label(record.best)}`}
          </Text>
        </Text>
      ) : null}
    </View>
  );
}
