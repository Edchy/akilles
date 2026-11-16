import { Redirect, router, useLocalSearchParams } from "expo-router";
import { WorkoutLoop } from "@/components/loop-scope";
import { SlotSheet } from "@/components/modules";
import { SafeScreen } from "@/components/screen";
import { useSession } from "@/store/session";

export default function ReplacementsScreen() {
  const { id, slot } = useLocalSearchParams<{ id: string; slot: string }>();
  return (
    <WorkoutLoop id={id}>
      <Slot id={id} slot={slot} />
    </WorkoutLoop>
  );
}

function Slot({ id, slot }: { id: string; slot: string }) {
  const { state } = useSession();
  const entry = state.workouts.find((w) => w.id === id)?.exercises.find((e) => e.id === slot);
  if (!entry) return <Redirect href={{ pathname: "/plan-editor", params: { id } }} />;
  return <SafeScreen><SlotSheet embedded replacements workoutId={id} entry={entry} onClose={() => router.back()} /></SafeScreen>;
}
