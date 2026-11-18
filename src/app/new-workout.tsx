import { router } from "expo-router";

import { useHideBar } from "@/components/bar-actions";
import { NewWorkoutOptions } from "@/components/modules";
import { Sheet } from "@/components/sheet";
import { SafeScreen } from "@/components/screen";
import { newId } from "@/data/split";
import type { WorkoutKind } from "@/data/kinds";

/**
 * A new workout: of a kind, or a copy of one you have. Nothing is added yet:
 * the editor makes it in its draft, and it joins the active workouts, at the
 * bottom, only when you save it.
 */
export default function NewWorkoutScreen() {
  useHideBar();
  const open = (params: Record<string, string>) =>
    router.replace({ pathname: "/plan-editor", params: { id: newId("w"), ...params } });

  return (
    <SafeScreen>
      <Sheet embedded full visible title="New workout" onClose={() => router.back()}>
        <NewWorkoutOptions
          onKind={(kind: WorkoutKind) => open({ make: kind })}
          onCopy={(from: string) => open({ copy: from, naming: "1" })}
        />
      </Sheet>
    </SafeScreen>
  );
}
