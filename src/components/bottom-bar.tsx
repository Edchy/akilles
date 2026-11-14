import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { usePathname } from "expo-router";
import { createContext, useContext, type PropsWithChildren, type ReactNode } from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import { useOnCard } from "@/components/card-context";
import { Text } from "@/components/text";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { COLUMN } from "@/components/screen";
import { BAR, colors, FAMILY, fieldColors, fonts, radii } from "@/constants/theme";
import type { Family } from "@/data/families";
import { isComplete, itemFamily, useSession } from "@/store/session";

/** Checked once: the phone either draws Liquid Glass or it doesn't. */
const GLASS = isLiquidGlassAvailable();

/**
 * What the bar is floating over: a family's field while you lift, white
 * everywhere else. The bar is mounted once, above every screen, so it works
 * this out for itself rather than being told.
 */
function useGround(): Family | null {
  const { state } = useSession();
  const pathname = usePathname();
  const active = state.active;
  if (pathname !== "/workout" || !active || isComplete(state)) return null;
  const item = active.items[active.cursor];
  return item ? itemFamily(item) : null;
}

/**
 * The bar's words and its pressed fill, matched to what is under the glass:
 * white on the dark fields, navy on the light ones and on white.
 */
type Ink = { ink: string; quiet: string; pressed: string };
const WHITE_INK: Ink = { ink: colors.text, quiet: colors.muted, pressed: colors.surface };
const inkFor = (ground: Family | null): Ink => {
  if (!ground) return WHITE_INK;
  const on = FAMILY[ground].dark ? colors.white : colors.text;
  return {
    ink: on,
    quiet: on,
    pressed: FAMILY[ground].dark ? "rgba(255, 255, 255, 0.18)" : "rgba(19, 50, 91, 0.10)",
  };
};
const InkContext = createContext<Ink>(WHITE_INK);

/** How far the capsule floats above the bottom edge of the screen. */
function useBarBottom() {
  const insets = useSafeAreaInsets();
  // Tucked into the home-indicator area, as the system tab bar is; phones
  // without one get a margin instead.
  return Math.max(insets.bottom - 8, BAR.margin);
}

/**
 * The room a screen leaves at its foot so its last line or its buttons sit
 * clear of the floating bar. Scrolling content still passes under the glass.
 */
export function useBarSpace() {
  const onCard = useOnCard();
  const bottom = useBarBottom();
  // A card of the workout's row sits clear of everything by itself.
  return onCard ? 0 : bottom + BAR.height + 8;
}

/**
 * The bar chrome: a capsule of Liquid Glass floating over the screen, so it
 * takes on whatever it sits over — white on Today, the family's colour while
 * you lift — with its words in that ground's ink. Mounted once for the life
 * of the app so it never animates with the screens; only its buttons change
 * as you navigate. Where the phone can't draw glass (older iOS, the web
 * preview) it is a white capsule on a soft shadow over white, and a tint of
 * the field over a field — never a white slab on colour.
 */
export function BottomBar({ children }: PropsWithChildren) {
  const bottom = useBarBottom();
  const ground = useGround();
  const ink = inkFor(ground);
  const dark = !!ground && FAMILY[ground].dark;

  const capsule: ViewStyle = {
    width: "100%",
    maxWidth: COLUMN,
    height: BAR.height,
    borderRadius: radii.button,
    padding: BAR.padding,
    flexDirection: "row",
  };

  return (
    <View
      style={{
        pointerEvents: "box-none",
        position: "absolute",
        left: BAR.margin,
        right: BAR.margin,
        bottom,
        alignItems: "center",
      }}
    >
      <InkContext.Provider value={ink}>
        {GLASS ? (
          <GlassView
            glassEffectStyle="regular"
            colorScheme={dark ? "dark" : "light"}
            // Tinted with the field itself, so over orange it is orange glass
            // rather than a frosted white or a smoked navy.
            tintColor={ground ? `${FAMILY[ground].field}B3` : undefined}
            isInteractive
            style={capsule}
          >
            {children}
          </GlassView>
        ) : ground ? (
          <View style={[capsule, { backgroundColor: fieldColors(ground).raised }]}>{children}</View>
        ) : (
          <View
            style={[
              capsule,
              {
                backgroundColor: colors.white,
                borderWidth: 1,
                borderColor: "rgba(19, 50, 91, 0.08)",
                boxShadow: "0 12px 28px rgba(8, 28, 60, 0.16), 0 2px 6px rgba(8, 28, 60, 0.06)",
              },
            ]}
          >
            {children}
          </View>
        )}
      </InkContext.Provider>
    </View>
  );
}

/** The bar's labels: plain Garamond, in sentence case like everything else. */
export const barLabel = {
  fontFamily: fonts.regular,
  fontSize: BAR.label,
  lineHeight: BAR.label + 3,
} as const;

/**
 * One slot of the capsule: a glyph over its label, inside a rounded lozenge
 * that lights up for the current tab or under a pressing thumb. Every button
 * in the bar — tab or workout action — is one of these, so the bar keeps one
 * shape whatever it carries.
 */
export function Slot({
  icon,
  label,
  tint,
  fill,
  children,
}: {
  icon: IconName;
  label: string;
  tint: string;
  fill?: string;
  /** Drawn behind the glyph, inside the lozenge. */
  children?: ReactNode;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: radii.button,
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        overflow: "hidden",
        backgroundColor: fill ?? "transparent",
      }}
    >
      {children}
      <Icon name={icon} size={BAR.glyph} color={tint} />
      <Text style={[barLabel, { color: tint }]}>{label}</Text>
    </View>
  );
}


/** One of the three tabs. The current one sits in a soft grey pill. */
export function TabButton({
  icon,
  label,
  onPress,
  active,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active: boolean;
}) {
  const { ink, quiet, pressed: fill } = useContext(InkContext);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{ flex: 1 }}
    >
      {({ pressed }) => (
        <Slot
          icon={icon}
          label={label}
          tint={active ? ink : quiet}
          fill={active || pressed ? fill : undefined}
        />
      )}
    </Pressable>
  );
}

/** A workout action — Back, Leave or Skip. */
export function ActionButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { ink, pressed: fill } = useContext(InkContext);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ flex: 1, opacity: disabled ? 0.3 : 1 }}
    >
      {({ pressed }) => (
        <Slot icon={icon} label={label} tint={ink} fill={pressed ? fill : undefined} />
      )}
    </Pressable>
  );
}
