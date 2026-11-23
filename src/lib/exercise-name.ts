/**
 * The shorthand in exercise names, spelled out. Names stay short where you
 * train — "DB bench press" tells a dumbbell bench from a barbell one at a
 * glance — and are written out in full where there is room to read them,
 * as the how-to's title: "Dumbbell bench press".
 */
const SHORTHAND: Record<string, string> = { BB: "barbell", DB: "dumbbell", KB: "kettlebell", OH: "overhead" };

export function fullName(name: string): string {
  const spelled = name.replace(/\b(BB|DB|KB|OH)\b/g, (short) => SHORTHAND[short]);
  return spelled[0].toUpperCase() + spelled.slice(1);
}
