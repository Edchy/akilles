import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { useHideBar } from "@/components/bar-actions";
import { Button } from "@/components/buttons";
import { LoopScope, setPlanFocus } from "@/components/loop-scope";
import { NewWorkoutOptions } from "@/components/modules";
import { Sheet } from "@/components/sheet";
import { SafeScreen } from "@/components/screen";
import { Text } from "@/components/text";
import { colors } from "@/constants/theme";
import { newId, type Workout } from "@/data/split";
import type { WorkoutKind } from "@/data/kinds";
import {
  addWorkoutOfKind,
  copyWorkout,
  equipmentOf,
  fitsLoop,
  inLoop,
  loopInUse,
  loopName,
  loopOfWorkout,
  loopsFitting,
  moveToLoop,
  startLoopWith,
  useSession,
  viewLoop,
  type SessionState,
} from "@/store/session";

/**
 * A new workout, in the loop Plan is showing (`loop`), or as the first
 * workout of a new loop (`start`). A workout that doesn't fit its loop — no
 * equipment among gym workouts, or the other way round — asks first where
 * it should go: a loop it does fit, this one anyway, or a loop of its own.
 */
export default function NewWorkoutScreen() {
  useHideBar();
  const params = useLocalSearchParams<{ loop?: string; start?: string }>();
  const { state, setState } = useSession();
  const from = params.loop ?? loopInUse(state);
  const starting = params.start === "1";
  // The workout made, waiting for an answer: nothing is saved until there is one.
  const [asking, setAsking] = useState<{ made: SessionState; workout: Workout } | null>(null);

  const open = (id: string, extra?: Record<string, string>) =>
    router.replace({ pathname: "/plan-editor", params: { id, ...extra } });

  /** Save the outcome, show Plan the loop it went to, and open the workout. */
  const finish = (next: SessionState, id: string, note?: string, extra?: Record<string, string>) => {
    setState(next);
    const loop = loopOfWorkout(next, id);
    if (loop) setPlanFocus({ loop, note });
    open(id, extra);
  };

  const ownLoop = (made: SessionState, workout: Workout) => {
    const loopId = newId("l");
    const next = startLoopWith(made, workout.id, from, loopId);
    const name = loopName(next, loopId);
    const was = loopName(next, from);
    finish(next, workout.id, `New loop: ${name}. Your ${was} loop waits where you left it.`);
  };

  const create = (kind: WorkoutKind) => {
    const id = newId("w");
    const made = inLoop(state, from, (s) => addWorkoutOfKind(s, id, kind));
    const workout = viewLoop(made, from).workouts.find((w) => w.id === id);
    if (!workout) return;
    if (starting) return ownLoop(made, workout);
    const others = viewLoop(made, from).workouts.length > 1;
    if (others && !fitsLoop(made, workout, from)) return setAsking({ made, workout });
    finish(made, id);
  };

  const copy = (fromId: string) => {
    const id = newId("w");
    const made = inLoop(state, from, (s) => copyWorkout(s, fromId, id));
    const workout = viewLoop(made, from).workouts.find((w) => w.id === id);
    if (!workout) return;
    if (starting) return ownLoop(made, workout);
    finish(made, id, undefined, { naming: "1" });
  };

  return (
    <SafeScreen>
      <Sheet
        embedded
        full
        visible
        title={asking ? "Where does it go?" : starting ? "New loop" : "New workout"}
        onBack={asking ? () => setAsking(null) : undefined}
        onClose={() => router.back()}
      >
        {asking ? (
          <Question
            made={asking.made}
            workout={asking.workout}
            from={from}
            onHere={() => finish(asking.made, asking.workout.id)}
            onMove={(to) =>
              finish(
                moveToLoop(asking.made, asking.workout.id, from, to),
                asking.workout.id,
                `${asking.workout.name} added to your ${loopName(asking.made, to)} loop.`,
              )
            }
            onOwn={() => ownLoop(asking.made, asking.workout)}
          />
        ) : (
          <LoopScope loop={from}>
            {starting ? (
              <Text style={{ color: colors.text, fontSize: 19, lineHeight: 27, paddingTop: 12 }}>
                A loop is a set of workouts that take turns, like the one you have. A second loop is for when
                things change — a holiday with no gym, say. You switch between them in Plan. Start it with one
                workout:
              </Text>
            ) : null}
            <NewWorkoutOptions onKind={create} onCopy={copy} />
          </LoopScope>
        )}
      </Sheet>
    </SafeScreen>
  );
}

/** Where a workout that doesn't fit its loop should go. */
function Question({
  made,
  workout,
  from,
  onHere,
  onMove,
  onOwn,
}: {
  made: SessionState;
  workout: Workout;
  from: string;
  onHere: () => void;
  onMove: (loop: string) => void;
  onOwn: () => void;
}) {
  const none = equipmentOf(made, workout) === "none";
  const fitting = loopsFitting(made, workout, from).slice(0, 2);
  const here = loopName(made, from);
  const hereLabel = here ? `Add to ${here}` : "Add it with the others";
  return (
    <View style={{ gap: 12, paddingTop: 12 }}>
      <Text style={{ color: colors.text, fontSize: 24, lineHeight: 31, fontWeight: "700" }}>
        {none ? `${workout.name} needs no equipment.` : `${workout.name} needs equipment.`}
      </Text>
      <Text style={{ color: colors.text, fontSize: 19, lineHeight: 27, marginBottom: 12 }}>
        {fitting.length > 0
          ? `Your ${fitting.map((l) => l.name).join(" and ")} loop${fitting.length > 1 ? "s have" : " has"} workouts like this. Put it there?`
          : none
            ? "Keep it in a loop of its own, for when you're away from the gym? You can switch between loops any time in Plan."
            : "Keep it in a loop of its own, for when you're back at the gym? You can switch between loops any time in Plan."}
      </Text>
      {fitting.map((l, i) => (
        <Button key={l.id} kind={i === 0 ? "primary" : "secondary"} label={`Add to ${l.name}`} onPress={() => onMove(l.id)} />
      ))}
      {fitting.length === 0 ? <Button label="Make a new loop" onPress={onOwn} /> : null}
      <Button kind="secondary" label={hereLabel} onPress={onHere} />
      {fitting.length > 0 ? <Button kind="secondary" label="Make a new loop" onPress={onOwn} /> : null}
    </View>
  );
}
