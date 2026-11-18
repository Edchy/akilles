import { Stack, useGlobalSearchParams } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useState } from "react";

import { useHideBar } from "@/components/bar-actions";
import { DraftScope } from "@/components/draft-scope";
import { colors } from "@/constants/theme";
import type { WorkoutKind } from "@/data/kinds";
import { useReduceMotion } from "@/lib/use-reduce-motion";
import { addWorkoutOfKind, copyWorkout, type SessionState } from "@/store/session";

/**
 * The workout editor and the screens it opens, all on one draft — see
 * `DraftScope`. A new workout arrives as `make` (a kind) or `copy` (a
 * workout to copy), with the id it will have, and is made in the draft.
 */
export default function PlanEditorLayout() {
  useHideBar();
  const reduce = useReduceMotion();
  const params = useGlobalSearchParams<{ id?: string; make?: string; copy?: string }>();
  // Only what the editor opened with: later screens' params are not a new workout.
  const [make] = useState<((s: SessionState) => SessionState) | undefined>(() => {
    const { id, make: kind, copy } = params;
    if (!id) return undefined;
    if (kind) return (s: SessionState) => addWorkoutOfKind(s, id, kind as WorkoutKind);
    if (copy) return (s: SessionState) => copyWorkout(s, copy, id);
    return undefined;
  });
  // A modal is its own native window: swipes inside it need their own root,
  // or a swipe left on a row never starts and reads as a tap.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <DraftScope make={make}>
      <Stack screenOptions={{
        headerShown: false, contentStyle: { backgroundColor: colors.bg },
        animation: reduce ? "fade" : "default", gestureEnabled: !reduce,
        fullScreenGestureEnabled: !reduce,
      }}>
        <Stack.Screen name="index" options={{ gestureEnabled: false }} />
        <Stack.Screen name="exercise" />
        <Stack.Screen name="replacements" />
        <Stack.Screen name="guide" />
      </Stack>
    </DraftScope>
    </GestureHandlerRootView>
  );
}
