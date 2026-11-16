import { useState } from "react";
import { LinkButton } from "@/components/buttons";
import { Linking, Pressable, Switch, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";

import { Count, Setting, Step } from "@/components/controls";
import { DragList, type Drag } from "@/components/drag-list";
import { Icon } from "@/components/icon";
import { Mark, STAR } from "@/components/mark";
import { Segments } from "@/components/segments";
import { BigButton, SectionLabel, Sheet } from "@/components/sheet";
import { Text, TextInput } from "@/components/text";
import { tookLabel } from "@/components/goal-progress";
import { FAMILY, colors, fonts, radii } from "@/constants/theme";
import {
  GOAL_SETS,
  TARGET_LIMITS,
  currentStep,
  isOwned,
  movesOnWhen,
  stepAmount,
  type Goal,
  type GoalStep,
  type Measure,
} from "@/data/goals";
import { newId } from "@/data/split";
import {
  addGoal,
  addStep,
  deleteGoal,
  goalById,
  goalWorkouts,
  moveStep,
  newStep,
  practiseIn,
  removeStep,
  startFrom,
  updateGoal,
  updateStep,
  useSession,
  workoutFamily,
} from "@/store/session";

const VIOLET = FAMILY.goal.mark;
/** The goal's wash on white, as a workout card wears its family's. */
const WASH = `${FAMILY.goal.field}1A`;

const MEASURES: { value: Measure; label: string }[] = [
  { value: "reps", label: "Reps" },
  { value: "hold", label: "Hold" },
  { value: "practice", label: "Practice" },
];

const MEASURE_HINT: Record<Measure, string> = {
  reps: "Sets of reps, counted like a lift's.",
  hold: "Sets of seconds. Each circle is its own clock.",
  practice: "Minutes on a clock, with nothing to count. You say when you've got it.",
};

const NUMBER_LABEL: Record<Measure, string> = {
  reps: "Reps",
  hold: "Seconds",
  practice: "Minutes",
};

/** Screen-reader stand-ins for dragging: step a row up or down one place. */
const moveActions = (drag: Drag) => ({
  accessibilityActions: [
    ...(drag.index > 0 ? [{ name: "moveUp", label: "Move up" }] : []),
    ...(drag.index < drag.count - 1 ? [{ name: "moveDown", label: "Move down" }] : []),
  ],
  onAccessibilityAction: (e: { nativeEvent: { actionName: string } }) => {
    if (e.nativeEvent.actionName === "moveUp") drag.moveBy(-1);
    if (e.nativeEvent.actionName === "moveDown") drag.moveBy(1);
  },
});

/** A tutorial's link as something the phone can open: "youtu.be/…" works too. */
const openable = (link: string | undefined): string | null => {
  const raw = link?.trim();
  if (!raw || /\s/.test(raw) || !raw.includes(".")) return null;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
};

/** Open the goal's tutorial, if it has one the phone can open. */
export const openTutorial = (link: string | undefined) => {
  const url = openable(link);
  if (url) Linking.openURL(url).catch(() => {});
};

/** Whether a goal has a tutorial link worth offering. */
export const hasTutorial = (link: string | undefined): boolean => openable(link) !== null;

/**
 * The ladder in small: one bar a step, the ones behind you solid, the one
 * you are on longer, the ones to come faint. On a goal's card, and big on
 * the workout screen under the step's number.
 */
export function Pips({
  goal,
  color,
  size = "small",
  at: shown,
}: {
  goal: Goal;
  color: string;
  size?: "small" | "large";
  /** The step to mark as now, where it is not the goal's own — a session's. */
  at?: number;
}) {
  const at = shown ?? Math.min(goal.at, goal.steps.length - 1);
  const [short, long, height, gap] = size === "large" ? [22, 34, 5, 6] : [18, 26, 4, 4];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: "row", alignItems: "center", gap }}
    >
      {goal.steps.map((step, i) => (
        <View
          key={step.id}
          style={{
            width: i === at && (shown !== undefined || !goal.learned) ? long : short,
            height,
            borderRadius: height / 2,
            backgroundColor: color,
            opacity: isOwned(goal, i) || i === at ? 1 : 0.3,
          }}
        />
      ))}
    </View>
  );
}

/**
 * Plan's Goals: what you are learning, one card each, and a way to start
 * another. Each card says the step you are on and where you practise it; a
 * goal in no workout yet is drawn quietly, waiting for one. Goals already
 * learned sit under the list, still there to open.
 */
export function Goals() {
  const { state, setState } = useSession();
  const [editing, setEditing] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);

  const learning = state.goals.filter((g) => !g.learned);
  const learned = state.goals.filter((g) => g.learned);

  const create = () => {
    const id = newId("g");
    setState((s) => addGoal(s, id, ""));
    setFresh(id);
    setEditing(id);
  };

  return (
    <View style={{ gap: 24 }}>
      <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
        A goal is a skill you learn step by step, like a handstand. Put it in a
        workout and you practise one step there, right after the warm-up.
      </Text>

      {learning.length > 0 ? (
        <View style={{ gap: 12 }}>
          {learning.map((g) => (
            <GoalRow
              key={g.id}
              goal={g}
              onOpen={() => {
                setFresh(null);
                setEditing(g.id);
              }}
            />
          ))}
        </View>
      ) : null}

      {state.goals.length === 0 ? (
        <FirstGoal onCreate={create} />
      ) : (
        <AddRow label="New goal" onPress={create} />
      )}

      {learned.length > 0 ? (
        <View style={{ gap: 6 }}>
          <SectionLabel>Learned</SectionLabel>
          {learned.map((g) => (
            <Pressable
              key={g.id}
              accessibilityRole="button"
              onPress={() => {
                setFresh(null);
                setEditing(g.id);
              }}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                minHeight: 48,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Mark family="goal" size={20} />
              <Text style={{ flex: 1, color: colors.text, fontSize: 17 }}>{g.name}</Text>
              <Text style={{ color: colors.faint, fontSize: 15 }}>
                in {tookLabel(g.since, g.learned!)}
              </Text>
              <Icon name="open" size={13} color={colors.faint} />
            </Pressable>
          ))}
          <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
            They live in Progress now, out of every workout.
          </Text>
        </View>
      ) : null}

      <GoalSheet
        goalId={editing}
        naming={editing !== null && editing === fresh}
        onClose={() => {
          // A goal opened new and left without a name or a step was never really made.
          const left = editing ? goalById(state, editing) : undefined;
          if (left && !left.name.trim() && left.steps.length === 0) {
            setState((s) => deleteGoal(s, left.id));
          }
          setEditing(null);
          setFresh(null);
        }}
      />
    </View>
  );
}

// The start of the handstand push-up a fresh install comes with.
const EXAMPLE: { name: string; at: "done" | "now" | "next" | "goal" }[] = [
  { name: "Crow pose", at: "done" },
  { name: "Handstand", at: "now" },
  { name: "Forearm stand", at: "next" },
  { name: "Handstand push-up", at: "goal" },
];

const EXAMPLE_LABEL = { done: "done", now: "now", next: "", goal: "the goal" };

/**
 * Before the first goal: what one looks like — a handstand push-up as a
 * tutorial would teach it, a step at a time — and the one rule for moving
 * up, so "a skill you learn step by step" has a picture.
 */
function FirstGoal({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={{ gap: 24 }}>
      <View
        accessible
        accessibilityLabel={
          "For example, a handstand push-up, step by step: crow pose, done; handstand, " +
          "the step you are on; forearm stand; and the handstand push-up itself."
        }
        style={{
          paddingTop: 22,
          paddingHorizontal: 22,
          paddingBottom: 24,
          borderRadius: radii.card,
          borderCurve: "continuous",
          backgroundColor: WASH,
        }}
      >
        <Text
          style={{
            color: colors.muted,
            fontSize: 12.5,
            letterSpacing: 1.4,
            textTransform: "uppercase",
          }}
        >
          For example
        </Text>
        <Text style={{ marginTop: 6, color: colors.text, fontSize: 22.5, fontWeight: "500" }}>
          Handstand push-up
        </Text>
        <View style={{ marginTop: 20, gap: 16 }}>
          {/* The ladder's rail, behind its rungs. */}
          <View
            style={{
              position: "absolute",
              left: 11,
              top: 14,
              bottom: 14,
              width: 2,
              backgroundColor: `${VIOLET}4D`,
            }}
          />
          {EXAMPLE.map((s) => (
            <View
              key={s.name}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                minHeight: 28,
              }}
            >
              <Rung at={s.at} />
              <Text
                style={{
                  flex: 1,
                  color: colors.text,
                  fontSize: 17,
                  fontWeight: s.at === "now" ? "500" : "400",
                }}
              >
                {s.name}
              </Text>
              {EXAMPLE_LABEL[s.at] ? (
                <Text
                  style={{
                    color: s.at === "now" ? VIOLET : colors.muted,
                    fontSize: 15,
                    fontStyle: "italic",
                    fontWeight: s.at === "now" ? "500" : "400",
                  }}
                >
                  {EXAMPLE_LABEL[s.at]}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      </View>

      <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
        Get a step right two workouts in a row and you move up to the next one.
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={onCreate}
        style={({ pressed }) => ({
          minHeight: 58,
          borderRadius: radii.action,
          borderCurve: "continuous",
          backgroundColor: VIOLET,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Icon name="plus" size={18} color={colors.white} />
        <Text style={{ color: colors.white, fontSize: 19, fontWeight: "500" }}>New goal</Text>
      </Pressable>
    </View>
  );
}

/** One rung of the example: done, the one you are on, still to come, or the goal itself. */
function Rung({ at }: { at: "done" | "now" | "next" | "goal" }) {
  if (at === "goal") {
    return (
      <Svg width={24} height={24} viewBox="0 0 48 48">
        <Polygon
          points={STAR}
          fill={colors.white}
          stroke={VIOLET}
          strokeWidth={3.5}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (at === "done") {
    return (
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: VIOLET,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="check" size={13} color={colors.white} />
      </View>
    );
  }
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.white,
        borderWidth: at === "now" ? 2 : 1.5,
        borderColor: at === "now" ? VIOLET : `${VIOLET}59`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {at === "now" ? (
        <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: VIOLET }} />
      ) : null}
    </View>
  );
}

/** One goal on Plan's list: its star, name, where you are and where it runs. */
function GoalRow({ goal, onOpen }: { goal: Goal; onOpen: () => void }) {
  const { state } = useSession();
  const placed = goalWorkouts(state, goal);
  const n = goal.steps.length;
  const at = Math.min(goal.at, n - 1);
  const detail =
    n === 0
      ? "No steps yet"
      : placed.length === 0
        ? `${n} step${n === 1 ? "" : "s"} · not in a workout yet`
        : `Step ${at + 1} of ${n} · in ${placed.map((w) => w.name).join(", ")}`;
  const waiting = n === 0 || placed.length === 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${goal.name || "Untitled goal"}, ${detail}`}
      onPress={onOpen}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        minHeight: waiting ? 80 : 96,
        paddingLeft: 18,
        paddingRight: 20,
        paddingVertical: 16,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: waiting ? colors.surface : WASH,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ width: 26, alignItems: "center" }}>
        {waiting ? <OpenStar size={24} /> : <Mark family="goal" size={24} />}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text
          numberOfLines={1}
          style={{ color: colors.text, fontFamily: fonts.display, fontSize: 26, lineHeight: 31 }}
        >
          {goal.name || "Untitled goal"}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 16, fontStyle: "italic" }}>
          {detail}
        </Text>
        {!waiting ? (
          <View style={{ marginTop: 4 }}>
            <Pips goal={goal} color={VIOLET} />
          </View>
        ) : null}
      </View>
      <Icon name="open" size={15} color={colors.muted} />
    </Pressable>
  );
}

/** The star as an outline: a goal waiting for a workout, or the top of a ladder. */
function OpenStar({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Polygon points={STAR} fill="none" stroke={VIOLET} strokeWidth={3.5} strokeLinejoin="round" />
    </Svg>
  );
}

/**
 * Holds a switch in the middle of its row. Left to the row, a switch sits at
 * the top: it does not follow the row's centring the way other views do.
 */
function Centred({ children }: { children: React.ReactNode }) {
  return <View style={{ alignSelf: "stretch", justifyContent: "center" }}>{children}</View>;
}

/** A quiet + link at the foot of a list. */
function AddRow({ label, onPress }: { label: string; onPress: () => void }) {
  return <LinkButton kind="add" label={label} onPress={onPress} />;
}

/**
 * Everything about one goal: its name and tutorial, the ladder of steps in
 * the order you climb them, and the workouts it is practised in. Changes
 * apply as you make them, from the next workout — the one running keeps the
 * step it started with. Opened from Plan, and from the goal's ⋯ mid-workout.
 */
export function GoalSheet({
  goalId,
  naming = false,
  onClose,
}: {
  goalId: string | null;
  naming?: boolean;
  onClose: () => void;
}) {
  const { state, setState } = useSession();
  const [stepping, setStepping] = useState<string | "new" | null>(null);
  const [dragging, setDragging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const goal = goalId ? goalById(state, goalId) : undefined;

  const close = () => {
    setStepping(null);
    setDeleting(false);
    onClose();
  };

  if (!goal) return <Sheet visible={false} title="" onClose={close} />;

  const current = currentStep(goal);
  const field = {
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  } as const;

  return (
    <Sheet visible full title="Goal" closeLabel="Done" scrollEnabled={!dragging} onClose={close}>
      <View style={{ gap: 36, paddingTop: 12 }}>
        <View style={{ gap: 10 }}>
          <TextInput
            value={goal.name}
            onChangeText={(name) => setState((s) => updateGoal(s, goal.id, { name }))}
            placeholder="What you're learning"
            placeholderTextColor={colors.faint}
            autoFocus={naming}
            returnKeyType="done"
            style={{ ...field, minHeight: 64, fontSize: 26, fontWeight: "700" }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TextInput
              value={goal.link ?? ""}
              onChangeText={(link) => setState((s) => updateGoal(s, goal.id, { link }))}
              placeholder="Paste the tutorial's link (optional)"
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="done"
              style={{ ...field, flex: 1 }}
            />
            {hasTutorial(goal.link) ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Open the tutorial"
                onPress={() => openTutorial(goal.link)}
                style={({ pressed }) => ({
                  width: 52,
                  height: 52,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  backgroundColor: colors.raised,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Icon name="play" size={20} color={colors.text} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <View style={{ flex: 1 }}>
              <SectionLabel>Steps</SectionLabel>
            </View>
            {goal.steps.length > 0 ? (
              <Text style={{ color: colors.faint, fontSize: 15 }}>
                {goal.steps.length} step{goal.steps.length === 1 ? "" : "s"}
              </Text>
            ) : null}
          </View>
          <DragList
            data={goal.steps}
            keyOf={(st) => st.id}
            gap={8}
            onDragChange={setDragging}
            onMove={(from, to) => setState((s) => moveStep(s, goal.id, from, to))}
            renderItem={(st, drag) => (
              <StepRow goal={goal} step={st} drag={drag} onOpen={() => setStepping(st.id)} />
            )}
          />
          {goal.steps.length === 0 ? (
            <Text style={{ color: colors.faint, fontSize: 15, lineHeight: 21 }}>
              No steps yet. Start with the easiest version you can do today, and end on the
              goal itself.
            </Text>
          ) : null}
          <AddRow label="Add step" onPress={() => setStepping("new")} />
          {goal.steps.length > 1 ? (
            <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
              Tap a step to change it or work on it from there. Hold and drag to reorder.
            </Text>
          ) : null}
          {goal.learned ? (
            <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
              Learned in {tookLabel(goal.since, goal.learned)}. Add a step to keep climbing.
            </Text>
          ) : null}
        </View>

        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <View style={{ flex: 1 }}>
              <SectionLabel>Practise in</SectionLabel>
            </View>
            <Text style={{ color: colors.faint, fontSize: 15 }}>First, after the warm-up</Text>
          </View>
          <View
            style={{
              borderRadius: radii.card,
              borderCurve: "continuous",
              backgroundColor: colors.surface,
              paddingHorizontal: 18,
              paddingVertical: 4,
            }}
          >
            {state.workouts.map((w, i) => {
              const on = goal.workouts.includes(w.id);
              return (
                <View
                  key={w.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    minHeight: 60,
                    borderBottomWidth: i === state.workouts.length - 1 ? 0 : 1,
                    borderBottomColor: colors.line,
                  }}
                >
                  <Mark family={workoutFamily(state, w)} size={20} />
                  <Text style={{ flex: 1, color: colors.text, fontSize: 17, fontWeight: "600" }}>
                    {w.name || "Untitled"}
                  </Text>
                  <Centred>
                    <Switch
                      accessibilityLabel={`Practise in ${w.name}`}
                      value={on}
                      disabled={!!goal.learned}
                      trackColor={{ true: VIOLET }}
                      onValueChange={(v) => setState((s) => practiseIn(s, goal.id, w.id, v))}
                    />
                  </Centred>
                </View>
              );
            })}
          </View>
          {current ? null : (
            <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
              It joins a workout once it has a step to do.
            </Text>
          )}
        </View>

        <View style={{ gap: 8 }}>
          <BigButton
            label={deleting ? "Delete it and its progress" : "Delete goal"}
            quiet={!deleting}
            danger={deleting}
            onPress={() => {
              if (!deleting) return setDeleting(true);
              setState((s) => deleteGoal(s, goal.id));
              close();
            }}
          />
          {deleting ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setDeleting(false)}
              style={({ pressed }) => ({
                alignSelf: "center",
                minHeight: 44,
                justifyContent: "center",
                paddingHorizontal: 20,
                opacity: pressed ? 0.5 : 1,
              })}
            >
              <Text style={{ color: colors.muted, fontSize: 15, fontWeight: "700" }}>Keep it</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <StepSheet goal={goal} stepId={stepping} onClose={() => setStepping(null)} />
    </Sheet>
  );
}

/** A step in the goal's sheet: its number — or a tick once owned — the drill, and how much. */
function StepRow({
  goal,
  step,
  drag,
  onOpen,
}: {
  goal: Goal;
  step: GoalStep;
  drag: Drag;
  onOpen: () => void;
}) {
  const i = drag.index;
  const done = isOwned(goal, i);
  const now = !goal.learned && i === Math.min(goal.at, goal.steps.length - 1);
  const measure = MEASURES.find((m) => m.value === step.measure)!.label;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Step ${i + 1}, ${step.name}, ${stepAmount(step)}${
        done ? ", owned" : now ? ", working on it now" : ""
      }`}
      accessibilityHint="Opens the step. Hold and drag to reorder."
      {...moveActions(drag)}
      onPress={onOpen}
      onLongPress={drag.start}
      onPressOut={drag.cancel}
      delayLongPress={250}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        minHeight: 64,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 18,
        borderCurve: "continuous",
        backgroundColor: now ? WASH : colors.surface,
        borderWidth: 1.5,
        borderColor: drag.active ? VIOLET : "transparent",
        opacity: pressed && !drag.active ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: done ? VIOLET : now ? colors.white : colors.raised,
          borderWidth: now ? 2.5 : 0,
          borderColor: VIOLET,
        }}
      >
        {done ? (
          <Icon name="check" size={14} color={colors.white} />
        ) : (
          <Text
            style={{
              marginTop: -2,
              color: now ? VIOLET : colors.muted,
              fontFamily: fonts.semibold,
              fontSize: 16,
            }}
          >
            {i + 1}
          </Text>
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ color: colors.text, fontSize: 17, fontWeight: "600" }}>
          {step.name || "Untitled step"}
        </Text>
        <Text numberOfLines={1} style={{ color: colors.faint, fontSize: 14 }}>
          {measure} · {stepAmount(step)}
          {now ? (
            <Text style={{ color: VIOLET, fontStyle: "italic" }}>
              {goal.streak > 0 ? " · now, owned once" : " · now"}
            </Text>
          ) : null}
        </Text>
      </View>
      <Icon name="open" size={13} color={colors.faint} />
    </Pressable>
  );
}

/**
 * One step: what you do, how it is measured, how much, and the cue from
 * the video. A new step is a draft until you add it; an existing one
 * changes as you edit, and can be made the one you work on.
 */
function StepSheet({
  goal,
  stepId,
  onClose,
}: {
  goal: Goal;
  stepId: string | "new" | null;
  onClose: () => void;
}) {
  const { setState } = useSession();
  const existing = goal.steps.find((st) => st.id === stepId);
  const isNew = stepId === "new";
  // A new step's draft. Kept here until Add, so a cancelled one leaves nothing.
  const [draft, setDraft] = useState<GoalStep>(() => newStep(newId("st")));
  const [removing, setRemoving] = useState(false);
  const [lastOpen, setLastOpen] = useState(stepId);
  if (stepId !== lastOpen) {
    // Each opening starts clean.
    setLastOpen(stepId);
    setRemoving(false);
    if (stepId === "new") setDraft(newStep(newId("st")));
  }

  const step = isNew ? draft : existing;
  if (!step) return <Sheet visible={false} title="" onClose={onClose} />;

  const index = isNew ? goal.steps.length : goal.steps.indexOf(step);
  const change = (patch: Partial<Omit<GoalStep, "id">>) => {
    if (isNew) setDraft((d) => ({ ...d, ...patch }));
    else setState((s) => updateStep(s, goal.id, step.id, patch));
  };
  const limits = TARGET_LIMITS[step.measure];
  const current = !goal.learned && index === Math.min(goal.at, goal.steps.length - 1);
  const field = {
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    color: colors.text,
  } as const;

  return (
    <Sheet
      visible
      title={`Step ${index + 1}`}
      closeLabel={isNew ? "Cancel" : "Done"}
      onClose={onClose}
    >
      <View style={{ gap: 30, paddingTop: 12 }}>
        <View style={{ gap: 8 }}>
          <SectionLabel>What you do</SectionLabel>
          <TextInput
            value={step.name}
            onChangeText={(name) => change({ name })}
            placeholder="Pike push-up, wall plank…"
            placeholderTextColor={colors.faint}
            autoFocus={isNew}
            returnKeyType="done"
            style={{ ...field, minHeight: 56, fontSize: 20, fontWeight: "600" }}
          />
        </View>

        <View style={{ gap: 10 }}>
          <SectionLabel>Measured in</SectionLabel>
          <Segments
            options={MEASURES}
            value={step.measure}
            onChange={(measure) => {
              if (measure === step.measure) return;
              change({ measure, target: TARGET_LIMITS[measure].start });
            }}
          />
          <Text style={{ color: colors.faint, fontSize: 14, lineHeight: 20 }}>
            {MEASURE_HINT[step.measure]}
          </Text>
          <View
            style={{
              borderRadius: radii.card,
              borderCurve: "continuous",
              backgroundColor: colors.surface,
              paddingHorizontal: 18,
              paddingVertical: 6,
            }}
          >
            {step.measure !== "practice" ? (
              <Setting label="Sets">
                <Step
                  icon="minus"
                  label="One set fewer"
                  disabled={step.sets <= GOAL_SETS.min}
                  onPress={() => change({ sets: step.sets - 1 })}
                />
                <Count value={step.sets} />
                <Step
                  icon="plus"
                  label="One set more"
                  disabled={step.sets >= GOAL_SETS.max}
                  onPress={() => change({ sets: step.sets + 1 })}
                />
              </Setting>
            ) : null}
            <Setting label={NUMBER_LABEL[step.measure]} last>
              <Step
                icon="minus"
                label={`Fewer ${NUMBER_LABEL[step.measure].toLowerCase()}`}
                disabled={step.target <= limits.min}
                onPress={() => change({ target: Math.max(limits.min, step.target - limits.step) })}
              />
              <Count value={step.target} />
              <Step
                icon="plus"
                label={`More ${NUMBER_LABEL[step.measure].toLowerCase()}`}
                disabled={step.target >= limits.max}
                onPress={() => change({ target: Math.min(limits.max, step.target + limits.step) })}
              />
            </Setting>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <SectionLabel>Note</SectionLabel>
          <TextInput
            value={step.note ?? ""}
            onChangeText={(note) => change({ note: note.replace(/\s*\n\s*/g, " ") })}
            placeholder="The cue from the video, if there is one"
            placeholderTextColor={colors.faint}
            multiline
            submitBehavior="blurAndSubmit"
            returnKeyType="done"
            maxLength={120}
            style={{ ...field, minHeight: 56, paddingTop: 15, paddingBottom: 15, fontSize: 17 }}
          />
        </View>

        <View
          style={{
            flexDirection: "row",
            gap: 12,
            alignItems: "flex-start",
            padding: 16,
            borderRadius: 22,
            borderCurve: "continuous",
            backgroundColor: WASH,
          }}
        >
          <View style={{ marginTop: 3 }}>
            <Mark family="goal" size={18} />
          </View>
          <Text style={{ flex: 1, color: colors.text, fontSize: 16, lineHeight: 23 }}>
            {movesOnWhen(step.measure, step.target)}
          </Text>
        </View>

        {isNew ? (
          <BigButton
            label="Add step"
            disabled={!step.name.trim()}
            onPress={() => {
              setState((s) => addStep(s, goal.id, { ...step, name: step.name.trim() }));
              onClose();
            }}
          />
        ) : (
          <View style={{ gap: 10 }}>
            {current ? (
              <Text style={{ color: colors.faint, fontSize: 15, textAlign: "center" }}>
                This is the step you're on.
              </Text>
            ) : (
              <BigButton
                label="Work on this step now"
                onPress={() => {
                  setState((s) => startFrom(s, goal.id, index));
                  onClose();
                }}
              />
            )}
            <BigButton
              label={removing ? "Remove this step" : "Remove step"}
              quiet={!removing}
              danger={removing}
              onPress={() => {
                if (!removing) return setRemoving(true);
                setState((s) => removeStep(s, goal.id, step.id));
                onClose();
              }}
            />
          </View>
        )}
      </View>
    </Sheet>
  );
}

/**
 * A workout's goals, in its own sheet in Plan, between the warm-up and the
 * exercises — where they run. Every goal you are learning, each with a
 * switch to practise it here; the name opens the goal. Shown once you have
 * a goal at all.
 */
export function WorkoutGoals({ workoutId }: { workoutId: string }) {
  const { state, setState } = useSession();
  const [open, setOpen] = useState<string | null>(null);
  const learning = state.goals.filter((g) => !g.learned);
  if (learning.length === 0) return null;
  return (
    <View style={{ gap: 12 }}>
      <SectionLabel>Goals</SectionLabel>
      <View
        style={{
          borderRadius: radii.card,
          borderCurve: "continuous",
          backgroundColor: colors.surface,
          paddingHorizontal: 18,
          paddingVertical: 4,
        }}
      >
        {learning.map((g, i) => {
          const n = g.steps.length;
          return (
            <View
              key={g.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                minHeight: 64,
                borderBottomWidth: i === learning.length - 1 ? 0 : 1,
                borderBottomColor: colors.line,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityHint="Opens the goal"
                onPress={() => setOpen(g.id)}
                style={({ pressed }) => ({
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  minHeight: 56,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Mark family="goal" size={20} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text numberOfLines={1} style={{ color: colors.text, fontSize: 17, fontWeight: "600" }}>
                    {g.name || "Untitled goal"}
                  </Text>
                  <Text style={{ color: colors.faint, fontSize: 13 }}>
                    {n === 0 ? "No steps yet" : `Step ${Math.min(g.at, n - 1) + 1} of ${n}`}
                  </Text>
                </View>
              </Pressable>
              <Centred>
                <Switch
                  accessibilityLabel={`Practise ${g.name} in this workout`}
                  value={g.workouts.includes(workoutId)}
                  trackColor={{ true: VIOLET }}
                  onValueChange={(v) => setState((s) => practiseIn(s, g.id, workoutId, v))}
                />
              </Centred>
            </View>
          );
        })}
      </View>
      <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
        First thing after the warm-up, while you are fresh. New goals start under Plan › Goals.
      </Text>
      <GoalSheet goalId={open} onClose={() => setOpen(null)} />
    </View>
  );
}
