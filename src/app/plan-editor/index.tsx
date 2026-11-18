import { Redirect, router, useLocalSearchParams } from "expo-router";
import { WorkoutLoop } from "@/components/loop-scope";
import { useDraft } from "@/components/draft-scope";
import { WorkoutSheet } from "@/components/modules";
import { SafeScreen } from "@/components/screen";
import { useSession } from "@/store/session";

export default function PlanEditorScreen() {
  const { id, naming } = useLocalSearchParams<{ id: string; naming?: string }>();
  return (
    <WorkoutLoop id={id}>
      <Editor id={id} naming={naming === "1"} />
    </WorkoutLoop>
  );
}

/** The workout, in whichever loop it is: see `WorkoutLoop`. */
function Editor({ id, naming }: { id: string; naming: boolean }) {
  const { state } = useSession();
  const draft = useDraft();
  const workout = state.workouts.find((w) => w.id === id);
  if (!workout) return <Redirect href="/plan" />;
  return (
    <SafeScreen>
      {/* Done saves the draft and closes: see `DraftScope`. */}
      <WorkoutSheet embedded workout={workout} naming={naming} onClose={() => (draft ? draft.done() : router.back())} />
    </SafeScreen>
  );
}
