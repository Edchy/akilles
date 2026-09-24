import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Text, type ColorValue } from "react-native";

/**
 * Every icon in the app, by what it means rather than what it looks like.
 *
 * Drawn from SF Symbols so they sit on the same baseline and stroke as the
 * rest of iOS. The tabs say plainly what is behind them: Today the dumbbell
 * you pick up, Progress the line going up, Plan the clipboard. The workout
 * bar borrows the media controls everyone already knows — previous and next
 * exercise either side of the ×. `glyph` is only a stand-in where SF Symbols
 * do not exist (the web preview); on the phone it is never drawn.
 */
const ICONS = {
  today: { sf: "dumbbell", glyph: "◎" },
  progress: { sf: "chart.line.uptrend.xyaxis", glyph: "↗" },
  plan: { sf: "list.bullet.clipboard", glyph: "☰" },
  previous: { sf: "backward.end.fill", glyph: "⏮" },
  next: { sf: "forward.end.fill", glyph: "⏭" },
  back: { sf: "arrow.left", glyph: "←" },
  forward: { sf: "arrow.right", glyph: "→" },
  close: { sf: "xmark", glyph: "×" },
  swap: { sf: "arrow.triangle.2.circlepath", glyph: "⇄" },
  plus: { sf: "plus", glyph: "+" },
  minus: { sf: "minus", glyph: "−" },
  check: { sf: "checkmark", glyph: "✓" },
  expand: { sf: "chevron.down", glyph: "▼" },
  open: { sf: "chevron.right", glyph: "›" },
  collapse: { sf: "chevron.up", glyph: "▲" },
} as const satisfies Record<string, { sf: SymbolViewProps["name"]; glyph: string }>;

export type IconName = keyof typeof ICONS;

export function Icon({
  name,
  size,
  color,
  weight = "medium",
}: {
  name: IconName;
  size: number;
  color: ColorValue;
  weight?: "light" | "regular" | "medium" | "semibold" | "bold";
}) {
  const icon = ICONS[name];
  return (
    <SymbolView
      name={icon.sf}
      size={size}
      tintColor={color}
      weight={weight}
      resizeMode="scaleAspectFit"
      style={{ width: size, height: size }}
      fallback={
        <Text style={{ color, fontSize: size * 0.8, lineHeight: size, textAlign: "center" }}>
          {icon.glyph}
        </Text>
      }
    />
  );
}
