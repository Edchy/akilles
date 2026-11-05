import { useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";

import { Icon } from "@/components/icon";
import { Mark, STAR } from "@/components/mark";
import { Text } from "@/components/text";
import { FAMILY, colors, fonts, radii } from "@/constants/theme";
import { isOwned, isStarted, type Goal } from "@/data/goals";
import { useSession } from "@/store/session";

const VIOLET = FAMILY.goal.mark;
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "21 Oct". */
const shortDate = (t: number) => {
  const d = new Date(t);
  return `${d.getDate()} ${MONTH[d.getMonth()]}`;
};

/** "4 days", "9 weeks": how long a goal took. */
export const tookLabel = (from: number, to: number): string => {
  const days = Math.max(1, Math.round((to - from) / 86_400_000));
  if (days < 14) return `${days} day${days === 1 ? "" : "s"}`;
  return `${Math.round(days / 7)} weeks`;
};

/**
 * Goals in Progress: each one you are learning as its ladder — the steps
 * behind you with the day you owned them, the one you are on, the ones still
 * to come — and the goals you have learned, with how long each took. The
 * first is open; the rest fold to a line, so a few goals never bury the week.
 */
export function GoalProgress() {
  const { state } = useSession();
  // Only goals you have begun: one that is only written down waits in Plan.
  const learning = state.goals.filter((g) => !g.learned && g.steps.length > 0 && isStarted(g));
  const learned = state.goals.filter((g) => g.learned);
  const [open, setOpen] = useState<string | null>(learning[0]?.id ?? null);

  if (learning.length === 0 && learned.length === 0) return null;

  return (
    <View style={{ gap: 12 }}>
      {learning.length > 0 ? (
        <Text style={{ color: colors.muted, fontSize: 19, fontStyle: "italic" }}>Goals</Text>
      ) : null}
      {learning.map((g) => (
        <GoalCard
          key={g.id}
          goal={g}
          open={open === g.id}
          onToggle={() => setOpen((o) => (o === g.id ? null : g.id))}
        />
      ))}

      {learned.length > 0 ? (
        <View style={{ gap: 4, marginTop: learning.length > 0 ? 6 : 0 }}>
          <Text style={{ color: colors.muted, fontSize: 19, fontStyle: "italic" }}>Learned</Text>
          {learned.map((g) => (
            <View
              key={g.id}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 }}
            >
              <Mark family="goal" size={22} />
              <Text style={{ flex: 1, color: colors.text, fontSize: 20 }}>{g.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 17 }}>
                {tookLabel(g.since, g.learned!)} · {shortDate(g.learned!)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function GoalCard({ goal, open, onToggle }: { goal: Goal; open: boolean; onToggle: () => void }) {
  const at = Math.min(goal.at, goal.steps.length - 1);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={onToggle}
      style={({ pressed }) => ({
        gap: 14,
        paddingHorizontal: 18,
        paddingTop: open ? 20 : 16,
        paddingBottom: 16,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: `${FAMILY.goal.field}1A`,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Mark family="goal" size={24} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            numberOfLines={1}
            style={{ color: colors.text, fontFamily: fonts.display, fontSize: 26, lineHeight: 30 }}
          >
            {goal.name}
          </Text>
          {open ? (
            <Text style={{ color: colors.muted, fontSize: 17, fontStyle: "italic" }}>
              Step {at + 1} of {goal.steps.length} · since {shortDate(goal.since)}
            </Text>
          ) : null}
        </View>
        {open ? null : (
          <Text style={{ color: colors.muted, fontSize: 17 }}>
            step {at + 1} of {goal.steps.length}
          </Text>
        )}
        <Icon name={open ? "collapse" : "expand"} size={15} color={colors.muted} />
      </View>

      {open ? <Ladder goal={goal} /> : null}
    </Pressable>
  );
}

/** The steps top to bottom, joined by a thin line: done, now, to come. */
function Ladder({ goal }: { goal: Goal }) {
  const at = Math.min(goal.at, goal.steps.length - 1);
  return (
    <View accessibilityRole="list">
      <View
        style={{
          position: "absolute",
          left: 10,
          top: 23,
          bottom: 23,
          width: 2,
          backgroundColor: `${VIOLET}40`,
        }}
      />
      {goal.steps.map((step, i) => {
        const done = isOwned(goal, i);
        const now = i === at && !goal.learned;
        const top = i === goal.steps.length - 1;
        const when = goal.owned[step.id];
        return (
          <View
            key={step.id}
            accessible
            accessibilityLabel={`Step ${i + 1}, ${step.name}${
              done ? ", owned" : now ? ", working on it" : ""
            }`}
            style={{ flexDirection: "row", alignItems: "center", gap: 14, height: 46 }}
          >
            {done ? (
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: VIOLET,
                }}
              >
                <Icon name="check" size={12} color={colors.white} />
              </View>
            ) : now ? (
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 3,
                  borderColor: VIOLET,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.white,
                }}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: VIOLET }} />
              </View>
            ) : top ? (
              // The last step is the goal itself: an open star at the top.
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white }}>
                <Svg width={22} height={22} viewBox="0 0 48 48">
                  <Polygon
                    points={STAR}
                    fill="none"
                    stroke={colors.faint}
                    strokeWidth={3.5}
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
            ) : (
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.raised }} />
            )}
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: done || now ? colors.text : colors.muted,
                fontSize: 19,
                fontWeight: now ? "500" : "400",
              }}
            >
              {step.name}
            </Text>
            {done && when ? (
              <Text style={{ color: colors.muted, fontSize: 15 }}>owned {shortDate(when)}</Text>
            ) : now ? (
              <Text style={{ color: VIOLET, fontSize: 15, fontStyle: "italic" }}>
                {goal.streak > 0 ? "owned once" : "now"}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
