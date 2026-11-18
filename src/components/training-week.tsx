import { View } from "react-native";
import { Text } from "@/components/text";
import { colors, fonts } from "@/constants/theme";
import type { SessionState } from "@/store/session";

const dayStart = (time: number) => {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

/** Calendar days, rather than 24-hour steps, keep daylight-saving weeks intact. */
export function TrainingWeek({ state }: { state: SessionState }) {
  const today = dayStart(Date.now());
  const monday = new Date(today);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const trained = new Set([
    ...state.log.map((session) => dayStart(session.startedAt)),
    ...Object.values(state.history).flatMap((entry) =>
      entry.lastTrainedAt ? [dayStart(entry.lastTrainedAt)] : [],
    ),
  ]);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + index);
    return date.getTime();
  });
  const count = days.filter((day) => trained.has(day)).length;

  return (
    <View style={{ gap: 18 }}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontFamily: fonts.display, fontSize: 34 }}>
        This week
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 4 }}>
        {days.map((day, index) => {
          const done = trained.has(day);
          const isToday = day === today;
          return (
            <View
              key={day}
              accessible
              accessibilityLabel={`${new Date(day).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}${isToday ? ", today" : ""}, ${done ? "trained" : day > today ? "upcoming" : "no workout recorded"}`}
              style={{ flex: 1, alignItems: "center", gap: 8 }}
            >
              <Text ui style={{ color: colors.muted, fontSize: 12 }}>{["M", "T", "W", "T", "F", "S", "S"][index]}</Text>
              <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: done ? colors.text : "transparent", borderWidth: isToday ? 2 : 1, borderColor: isToday || done ? colors.text : colors.line }}>
                <Text ui style={{ color: done ? colors.ink : colors.text, fontSize: 13, fontWeight: isToday ? "700" : "400", fontVariant: ["tabular-nums"] }}>
                  {new Date(day).getDate()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
      <Text ui style={{ color: colors.muted, fontSize: 14 }}>
        {count === 0 ? "No training recorded this week." : `Trained on ${count} ${count === 1 ? "day" : "days"} this week.`}
      </Text>
    </View>
  );
}
