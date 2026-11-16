import { Stack } from "expo-router";
import { useHideBar } from "@/components/bar-actions";
import { colors } from "@/constants/theme";
import { useReduceMotion } from "@/lib/use-reduce-motion";

export default function PlanEditorLayout() {
  useHideBar();
  const reduce = useReduceMotion();
  return (
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
  );
}
