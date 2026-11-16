import { router, useLocalSearchParams } from "expo-router";
import { Guide } from "@/components/guide";
import { Sheet } from "@/components/sheet";
import { SafeScreen } from "@/components/screen";
import { lookup, useSession } from "@/store/session";
import { cardioById, stretchById } from "@/data/conditioning";

/** A pushed native screen: iOS owns drag progress, cancellation and dismissal. */
export default function ExerciseGuideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useSession();
  const exercise = lookup(state, id);
  const movement = exercise ?? cardioById(id) ?? stretchById(id);
  return (
    <SafeScreen>
      <Sheet embedded visible title={movement?.name ?? "Exercise"} onBack={() => router.back()} onClose={() => router.back()}>
        <Guide id={id} cue={movement?.cue} />
      </Sheet>
    </SafeScreen>
  );
}
