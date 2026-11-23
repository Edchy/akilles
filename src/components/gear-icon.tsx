import Svg, { Path } from "react-native-svg";

import type { Exercise } from "@/data/exercises";
import { needsOf } from "@/data/kit";

/**
 * The gear that carries the weight, as a plain icon: drawn for Klay in
 * Phosphor's Bold style (the app's icons, see `components/icon.tsx`) — a
 * 256 grid, a 24-wide line, round ends — since no icon set had all five.
 * A barbell is a long bar with its plates, dumbbells a short pair, a cable a
 * tower with its pulley and handle, a machine its weight stack.
 */
const GEAR = {
  barbell: ["M20 128H236", "M56 64V192", "M92 92V164", "M200 64V192", "M164 92V164"],
  dumbbells: ["M100 128H156", "M44 96a20 20 0 0 1 20-20h16a20 20 0 0 1 20 20v64a20 20 0 0 1-20 20H64a20 20 0 0 1-20-20Z", "M156 96a20 20 0 0 1 20-20h16a20 20 0 0 1 20 20v64a20 20 0 0 1-20 20h-16a20 20 0 0 1-20-20Z"],
  kettlebell: ["M88 210A72 72 0 1 1 168 210Z", "M92 88L84 60A28 28 0 0 1 112 32H144A28 28 0 0 1 172 60L164 88"],
  cable: ["M188 32V224", "M140 224H232", "M188 40H100", "M100 40a24 24 0 1 0 0.01 0Z", "M100 88V152", "M60 164H140"],
  machine: ["M84 72H172a12 12 0 0 1 12 12V212a12 12 0 0 1-12 12H84a12 12 0 0 1-12-12V84a12 12 0 0 1 12-12Z", "M72 122H184", "M72 172H184", "M128 20V72"],
} as const;
export type Pictured = keyof typeof GEAR;

/** First match wins: a barbell on a bench is a barbell lift. */
const ORDER: Pictured[] = ["barbell", "dumbbells", "kettlebell", "cable", "machine"];

/** The gear an exercise is shown with, if any: bodyweight and gym stations have none. */
export function gearOf(exercise: Pick<Exercise, "id"> & Partial<Pick<Exercise, "equipment" | "bodyweight">>): Pictured | null {
  const needs = needsOf(exercise);
  return ORDER.find((g) => needs.includes(g)) ?? null;
}

export function GearIcon({ gear, size, color }: { gear: Pictured; size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" accessibilityElementsHidden importantForAccessibility="no">
      {GEAR[gear].map((d) => (
        <Path key={d} d={d} fill="none" stroke={color} strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}
