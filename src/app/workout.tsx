import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Column, COLUMN } from "@/components/screen";
import { useBarActions } from "@/components/bar-actions";
import { BarButton } from "@/components/bottom-bar";
import { HoldButton } from "@/components/hold-button";
import { colors, radii } from "@/constants/theme";
import { byId } from "@/data/exercises";
import { weightLabel } from "@/lib/warmup";
import {
  addSuperset,
  allSetsLogged,
  completeExercise,
  chooseExercise,
  currentPool,
  currentPrescription,
  currentTaken,
  currentWarmup,
  currentWorkout,
  exerciseCount,
  dismissWarmup,
  editWeight,
  finishWorkout,
  isComplete,
  madeTarget,
  nudgeWeight,
  partnerPrescription,
  previousExercise,
  removeSuperset,
  skipExercise,
  supersetOptions,
  tapSet,
  useSession,
} from "@/store/session";

const serif = process.env.EXPO_OS === "ios" ? "Georgia" : "serif";

export default function WorkoutScreen() {
  const { state, setState } = useSession();
  const insets = useSafeAreaInsets();
  const [picking, setPicking] = useState(false);
  const [swapping, setSwapping] = useState(false);

  const active = state.active;
  const done = !active || isComplete(state);

  // The bar itself lives in the root layout; this only swaps its buttons.
  useBarActions(
    active && !done ? (
      <>
        <BarButton
          glyph="←"
          label="Back"
          disabled={active.cursor === 0}
          onPress={() => {
            setPicking(false);
            setState((s) => previousExercise(s));
          }}
        />
        <HoldButton
          glyph="×"
          label="Leave"
          onHold={() => {
            // Leaving ends the session: whatever went unlogged is recorded as
            // skipped, and the cycle moves on. Nothing is owed. Held rather
            // than tapped so a stray thumb mid-set can't end the workout.
            setState((s) => finishWorkout(s));
            router.replace("/");
          }}
        />
        <BarButton
          glyph="→"
          label="Skip"
          onPress={() => {
            setPicking(false);
            setState((s) => skipExercise(s));
          }}
        />
      </>
    ) : null,
    [active?.cursor, done],
  );

  // Hooks must all run before this: the bar publish above is one of them.
  if (done) return <Finished hasSession={!!active} />;


  const p = currentPrescription(state)!;
  const item = active.items[active.cursor];
  const partner = item.supersetWith ? byId(item.supersetWith) : undefined;
  // The floater keeps its own scheme, set count and set log when folded in.
  const partnerP = partnerPrescription(state);
  const options = supersetOptions(state);

  const logged = allSetsLogged(state);
  const made = madeTarget(state);
  const warmup = currentWarmup(state);
  // Speed work and jumps have no ladder, so they are never rated.
  const noProgression = !!item.derive || !!p.exercise.unloaded;
  // Swapping after the first set is logged would throw that work away.
  const pool = currentPool(state);
  const canSwap = pool.length > 1 && !item.logged.some((r) => r !== null);

  if (warmup.length > 0) {
    return (
      <Warmup
        name={p.exercise.name}
        sets={warmup}
        perHand={p.exercise.perHand}
        onReady={() => setState((s) => dismissWarmup(s))}
      />
    );
  }

  const next = (feedback?: "up" | "down") => {
    setPicking(false);
    setState((s) => completeExercise(s, feedback));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header: just where you are. Leaving and skipping live in the bar
          at the bottom, next to the thumb. */}
      <View
        style={{
          paddingTop: insets.top + 14,
          paddingHorizontal: 22,
          paddingBottom: 14,
        }}
      >
        <Column style={{ gap: 12 }}>
          <Text
            style={{
              color: colors.muted,
              fontSize: 12,
              fontWeight: "800",
              letterSpacing: 1.3,
              textTransform: "uppercase",
            }}
          >
            {currentWorkout(state).name}
          </Text>

          {/* One segment per exercise, weighted: a paired screen holds two
              exercises, so it is twice as wide and the total never changes
              when you superset. */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ flex: 1, flexDirection: "row", gap: 3 }}>
              {active.items.map((it, i) => (
                <View
                  key={i}
                  style={{
                    flex: it.supersetWith ? 2 : 1,
                    height: 3,
                    borderRadius: 999,
                    backgroundColor:
                      i < active.cursor
                        ? colors.acid
                        : i === active.cursor
                          ? colors.muted
                          : colors.line,
                  }}
                />
              ))}
            </View>
            <Text
              style={{
                color: colors.faint,
                fontSize: 11,
                fontWeight: "800",
                fontVariant: ["tabular-nums"],
              }}
            >
              {exerciseCount(state, "done") + 1}/{exerciseCount(state, "total")}
            </Text>
          </View>
        </Column>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingBottom: 20,
          width: "100%",
          maxWidth: COLUMN,
          alignSelf: "center",
          gap: 22,
        }}
      >
        {/* The exercise and the weight are the surface — no card around them. */}
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text
              style={{
                flex: 1,
                color: colors.text,
                fontFamily: serif,
                fontSize: 40,
                lineHeight: 44,
                fontWeight: "700",
                letterSpacing: -1.5,
              }}
            >
              {p.exercise.name}
            </Text>

            {canSwap ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose a different exercise"
                onPress={() => setSwapping((v) => !v)}
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  backgroundColor: swapping ? colors.acid : colors.raised,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    color: swapping ? colors.ink : colors.muted,
                    fontSize: 17,
                    fontWeight: "700",
                  }}
                >
                  ⇄
                </Text>
              </Pressable>
            ) : null}
          </View>
          {p.exercise.timed ? (
            <Text style={{ color: colors.muted, fontSize: 15, fontWeight: "600" }}>
              seconds, not reps
            </Text>
          ) : null}
        </View>

        {p.exercise.unloaded ? null : item.derive ? (
          // Derived from the heavy day's weight, so there is nothing to edit.
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              style={{
                color: colors.acid,
                fontSize: 46,
                fontWeight: "800",
                letterSpacing: -2,
                fontVariant: ["tabular-nums"],
              }}
            >
              {p.weight}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 18, fontWeight: "700" }}>
              {p.exercise.perHand ? "kg ×2" : "kg"}
            </Text>
            <Text style={{ color: colors.faint, fontSize: 13, marginLeft: 6 }}>
              {Math.round(item.derive.fraction * 100)}% of{" "}
              {byId(item.derive.from)!.name.toLowerCase()}
            </Text>
          </View>
        ) : (
          <WeightControl
            weight={p.weight}
            bodyweight={p.exercise.bodyweight}
            perHand={p.exercise.perHand}
            onNudge={(d) => setState((s) => nudgeWeight(s, d))}
            onSet={(w) => setState((s) => editWeight(s, w))}
          />
        )}

        <Sets
          logged={item.logged}
          target={p.reps}
          onTap={(i) => setState((s) => tapSet(s, i))}
        />

        <Why prescription={p} />

        {swapping ? (
          <SwapList
            options={pool}
            taken={currentTaken(state)}
            current={item.exerciseId}
            onPick={(id) => {
              setSwapping(false);
              setState((s) => chooseExercise(s, active.workoutId, item.slot, id));
            }}
          />
        ) : null}

        {partner && partnerP && item.supersetLogged ? (
          <Partner
            name={partner.name}
            sets={partnerP.sets}
            target={partnerP.reps}
            timed={partner.timed}
            logged={item.supersetLogged}
            onTap={(i) => setState((s) => tapSet(s, i, "partner"))}
            onRemove={() => setState((s) => removeSuperset(s))}
          />
        ) : options.length > 0 && !picking ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setPicking(true)}
            style={({ pressed }) => ({
              alignItems: "center",
              justifyContent: "center",
              minHeight: 56,
              borderRadius: radii.card,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: colors.line,
              borderStyle: "dashed",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "700" }}>
              + Superset
            </Text>
          </Pressable>
        ) : null}

        {picking ? (
          <SupersetPicker
            options={options}
            onPick={(id) => {
              setPicking(false);
              setState((s) => addSuperset(s, id));
            }}
            onCancel={() => setPicking(false)}
          />
        ) : null}
      </ScrollView>

      {/* The action: one row, only when there is something to answer. */}
      <View style={{ paddingHorizontal: 22, paddingBottom: 14 }}>
        <Column>
          {logged && made ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Feedback label="Felt good" glyph="👍" fill onPress={() => next("up")} />
              <Feedback label="Felt heavy" glyph="👎" onPress={() => next("down")} />
            </View>
          ) : logged && noProgression ? (
            // Speed and jump work: nothing to rate, just move on.
            <Feedback label="Next exercise" fill onPress={() => next()} />
          ) : logged ? (
            <View style={{ gap: 10 }}>
              <Text
                style={{ textAlign: "center", color: colors.faint, fontSize: 13 }}
              >
                Short of target — same again next time.
              </Text>
              <Feedback label="Next exercise" fill onPress={() => next()} />
            </View>
          ) : null}
        </Column>
      </View>

    </View>
  );
}

/**
 * The exercises that can fill this slot. Picking one also makes it the
 * module's default from now on.
 */
function SwapList({
  options,
  taken,
  current,
  onPick,
}: {
  options: string[];
  /** Exercises another slot in this module is using — shown, but unavailable. */
  taken: Set<string>;
  current: string;
  onPick: (id: string) => void;
}) {
  return (
    <View
      style={{
        gap: 2,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        padding: 10,
      }}
    >
      {options.map((id) => {
        const active = id === current;
        const used = taken.has(id) && !active;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled: used }}
            disabled={used}
            onPress={() => onPick(id)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              minHeight: 50,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: active ? colors.acid : "transparent",
              opacity: used ? 0.35 : pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                flex: 1,
                color: active ? colors.ink : colors.text,
                fontSize: 16,
                fontWeight: active ? "800" : "600",
              }}
            >
              {byId(id)!.name}
            </Text>
            {used ? (
              <Text
                style={{
                  color: colors.faint,
                  fontSize: 10,
                  fontWeight: "800",
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                }}
              >
                In use
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The ramp before the first exercise of a muscle group. Nothing here is
 * logged or progressed — it exists to get you ready to lift the real weight.
 */
function Warmup({
  name,
  sets,
  perHand,
  onReady,
}: {
  name: string;
  sets: { weight: number; reps: number }[];
  perHand?: boolean;
  onReady: () => void;
}) {
  const insets = useSafeAreaInsets();
  // Local: a warm-up is never recorded, so this only exists to stop you
  // tapping past the screen without reading it.
  const [done, setDone] = useState<boolean[]>(() => sets.map(() => false));
  const allDone = done.every(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 22,
          paddingTop: insets.top,
        }}
      >
        <Column style={{ gap: 26 }}>
          <View style={{ gap: 6 }}>
            <Text
              style={{
                color: colors.acid,
                fontSize: 12,
                fontWeight: "800",
                letterSpacing: 1.4,
                textTransform: "uppercase",
              }}
            >
              Warm up
            </Text>
            <Text
              style={{
                color: colors.text,
                fontFamily: serif,
                fontSize: 38,
                lineHeight: 42,
                fontWeight: "700",
                letterSpacing: -1.4,
              }}
            >
              {name}
            </Text>
          </View>

          <View style={{ gap: 2 }}>
            {sets.map((set, i) => (
              <Pressable
                key={i}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: done[i] }}
                accessibilityLabel={`${set.weight} kg for ${set.reps} reps`}
                onPress={() =>
                  setDone((v) => v.map((d, j) => (j === i ? !d : d)))
                }
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                  borderBottomWidth: i === sets.length - 1 ? 0 : 1,
                  borderBottomColor: colors.line,
                  paddingVertical: 16,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text
                  style={{
                    flex: 1,
                    color: done[i] ? colors.faint : colors.text,
                    fontSize: 30,
                    fontWeight: "800",
                    letterSpacing: -1,
                    fontVariant: ["tabular-nums"],
                    textDecorationLine: done[i] ? "line-through" : "none",
                  }}
                >
                  {set.weight} kg{perHand ? " ×2" : ""}
                </Text>
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 18,
                    fontWeight: "700",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  × {set.reps}
                </Text>

                <View
                  style={{
                    width: 28,
                    height: 28,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    borderWidth: done[i] ? 0 : 1.5,
                    borderColor: colors.line,
                    backgroundColor: done[i] ? colors.acid : "transparent",
                  }}
                >
                  <Text
                    style={{
                      color: done[i] ? colors.ink : "transparent",
                      fontSize: 15,
                      fontWeight: "800",
                    }}
                  >
                    ✓
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
            Tap each set as you finish it. Not counted — move well and stop
            short of effort.
          </Text>
        </Column>
      </View>

      <View style={{ paddingHorizontal: 22, paddingBottom: 14 }}>
        <Column>
          <Feedback
            label="Ready"
            fill
            disabled={!allDone}
            onPress={onReady}
          />
        </Column>
      </View>
    </View>
  );
}

/**
 * One circle per set. Empty until tapped, then filled at the target reps,
 * counting down on each further tap and clearing when it passes 1.
 */
function Sets({
  logged,
  target,
  onTap,
  compact,
}: {
  logged: (number | null)[];
  target: number;
  onTap: (index: number) => void;
  /** Shorter circles for a supersetted partner, so the main lift stays primary. */
  compact?: boolean;
}) {
  // The circles span the full width with even gaps between them, so four sets
  // and two sets both fill the row. `aspectRatio` keeps each one round at
  // whatever width it lands on.
  //
  // A partner row is capped and packed left instead: with only two sets,
  // stretching them would make circles taller than the main lift's row, and
  // capping them under space-between would fling the pair to opposite edges.
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: compact ? "flex-start" : "space-between",
        gap: 12,
      }}
    >
      {logged.map((reps, i) => {
        const filled = reps !== null;
        const short = filled && reps < target;
        return (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Set ${i + 1}${filled ? `, ${reps} reps` : ", not logged"}`}
            onPress={() => onTap(i)}
            style={({ pressed }) => ({
              flex: compact ? undefined : 1,
              width: compact ? 56 : undefined,
              aspectRatio: 1,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              borderWidth: filled ? 0 : 2,
              borderColor: colors.line,
              backgroundColor: filled
                ? short
                  ? colors.coral
                  : colors.acid
                : "transparent",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                color: filled ? colors.ink : colors.faint,
                fontSize: compact ? 19 : 24,
                fontWeight: "800",
                fontVariant: ["tabular-nums"],
              }}
            >
              {filled ? reps : target}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Weight, editable at any time: type into it or step it by one increment. */
function WeightControl({
  weight,
  bodyweight,
  perHand,
  onNudge,
  onSet,
}: {
  weight: number;
  bodyweight?: boolean;
  /** Held in each hand: the number shown is one dumbbell, marked ×2. */
  perHand?: boolean;
  onNudge: (direction: 1 | -1) => void;
  onSet: (weight: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft !== null) {
      const parsed = parseFloat(draft.replace(",", "."));
      if (!Number.isNaN(parsed)) onSet(parsed);
    }
    setDraft(null);
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <Step label="−" onPress={() => onNudge(-1)} />

      {/* The input needs an explicit width: on web a TextInput has an
          intrinsic size that ignores flex and overflows its row. */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {bodyweight && weight === 0 && draft === null ? (
          // An unloaded bodyweight lift has no number worth showing — a bare
          // "0 kg" reads as an error. Tap it to add weight (belt, dumbbell).
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Bodyweight, tap to add load"
            onPress={() => setDraft("0")}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text
              style={{
                width: 190,
                textAlign: "center",
                color: colors.acid,
                fontSize: 34,
                fontWeight: "800",
                letterSpacing: -1,
              }}
            >
              Bodyweight
            </Text>
          </Pressable>
        ) : (
          <>
        <TextInput
          value={draft ?? String(weight)}
          onChangeText={setDraft}
          onFocus={() => setDraft(String(weight))}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="decimal-pad"
          selectTextOnFocus
          style={{
            width: 150,
            color: colors.acid,
            fontSize: 68,
            fontWeight: "800",
            letterSpacing: -3,
            textAlign: "right",
            fontVariant: ["tabular-nums"],
          }}
        />
        <View style={{ width: 58 }}>
          <Text style={{ color: colors.muted, fontSize: 20, fontWeight: "700" }}>
            kg
          </Text>
          {perHand ? (
            <Text style={{ color: colors.faint, fontSize: 13, fontWeight: "700" }}>
              ×2
            </Text>
          ) : null}
          {/* A negative weight on an assisted movement is help from the
              machine, not load — say so, or the number reads as an error. */}
          {weight < 0 ? (
            <Text style={{ color: colors.faint, fontSize: 12, fontWeight: "700" }}>
              assist
            </Text>
          ) : null}
          {bodyweight && weight > 0 ? (
            <Text style={{ color: colors.faint, fontSize: 12, fontWeight: "700" }}>
              added
            </Text>
          ) : null}
        </View>
          </>
        )}
      </View>

      <Step label="+" onPress={() => onNudge(1)} />
    </View>
  );
}

function Step({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        width: 52,
        height: 52,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        backgroundColor: colors.raised,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: colors.text, fontSize: 26, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

/** The line that explains where today's number came from. */
function Why({ prescription }: { prescription: ReturnType<typeof currentPrescription> }) {
  if (!prescription) return null;
  const { last, deloaded, skippedLast } = prescription;

  if (prescription.exercise.unloaded) {
    return (
      <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
        Maximum effort every rep. Rest as long as you need between sets.
      </Text>
    );
  }

  const text = skippedLast
    ? "Skipped last time. Same weight and reps as before."
    : deloaded
      ? "Backed off 10% after two heavy sessions. Build it up again."
      : last
        ? `Last time: ${weightLabel(prescription.exercise, last.weight)} · ${last.reps.join(" ")}${
            last.feedback ? (last.feedback === "up" ? "  👍" : "  👎") : ""
          }`
        : "First time on this one. Pick a weight you could do two more reps with.";

  return <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>{text}</Text>;
}

/** The folded-in floater: its own target and its own tappable circles. */
function Partner({
  name,
  sets,
  target,
  timed,
  logged,
  onTap,
  onRemove,
}: {
  name: string;
  sets: number;
  target: number;
  timed?: boolean;
  logged: (number | null)[];
  onTap: (index: number) => void;
  /** Unpair it: goes back to its own place in the workout, keeping its sets. */
  onRemove: () => void;
}) {
  return (
    <View
      style={{
        gap: 14,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        padding: 18,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              color: colors.acid,
              fontSize: 11,
              fontWeight: "800",
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            Superset with
          </Text>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>
            {name}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "600" }}>
            {sets} sets of {target}
            {timed ? " seconds" : ""}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${name} from this superset`}
          onPress={onRemove}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            marginTop: -8,
            marginRight: -8,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <Text style={{ color: colors.muted, fontSize: 18 }}>×</Text>
        </Pressable>
      </View>

      <Sets logged={logged} target={target} onTap={onTap} compact />
    </View>
  );
}

function SupersetPicker({
  options,
  onPick,
  onCancel,
}: {
  options: { id: string; name: string }[];
  onPick: (id: string) => void;
  onCancel: () => void;
}) {
  return (
    <View
      style={{
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        padding: 10,
      }}
    >
      {options.map((o) => (
        <Pressable
          key={o.id}
          onPress={() => onPick(o.id)}
          style={({ pressed }) => ({
            justifyContent: "center",
            minHeight: 52,
            borderRadius: 14,
            paddingHorizontal: 14,
            opacity: pressed ? 0.55 : 1,
          })}
        >
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "600" }}>
            {o.name}
          </Text>
        </Pressable>
      ))}
      <Pressable
        onPress={onCancel}
        style={({ pressed }) => ({
          justifyContent: "center",
          minHeight: 48,
          paddingHorizontal: 14,
          opacity: pressed ? 0.55 : 1,
        })}
      >
        <Text style={{ color: colors.faint, fontSize: 15, fontWeight: "600" }}>
          Cancel
        </Text>
      </Pressable>
    </View>
  );
}

function Feedback({
  label,
  glyph,
  onPress,
  fill,
  disabled,
}: {
  label: string;
  glyph?: string;
  onPress: () => void;
  /** The affirmative action, in acid. */
  fill?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 60,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        borderRadius: radii.button,
        borderCurve: "continuous",
        backgroundColor: fill ? colors.acid : colors.raised,
        opacity: disabled ? 0.3 : pressed ? 0.75 : 1,
      })}
    >
      {glyph ? <Text style={{ fontSize: 18 }}>{glyph}</Text> : null}
      <Text
        style={{
          color: fill ? colors.ink : colors.text,
          fontSize: 15,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Finished({ hasSession }: { hasSession: boolean }) {
  const { setState } = useSession();
  const insets = useSafeAreaInsets();

  const close = () => {
    if (hasSession) setState((s) => finishWorkout(s));
    router.replace("/");
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "space-between",
        backgroundColor: colors.bg,
        paddingTop: insets.top + 90,
        paddingHorizontal: 22,
        // The persistent bar already sits below, carrying the safe-area inset.
        paddingBottom: 20,
      }}
    >
      <Column style={{ gap: 12 }}>
        <Text
          style={{
            color: colors.text,
            fontFamily: serif,
            fontSize: 46,
            lineHeight: 49,
            fontWeight: "700",
            letterSpacing: -1.8,
          }}
        >
          Done.
        </Text>
        <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 24 }}>
          Next time picks up at the next workout in the cycle.
        </Text>
      </Column>
      <Column>
        <Feedback label="Close" fill onPress={close} />
      </Column>
    </View>
  );
}
