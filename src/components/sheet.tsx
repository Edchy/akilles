import type { PropsWithChildren, ReactNode } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import {
  SafeAreaProvider,
  initialWindowMetrics,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Text } from "@/components/text";

import { Plain } from "@/components/field";
import { Column } from "@/components/screen";
import { Icon } from "@/components/icon";
import { Button, LinkButton } from "@/components/buttons";
import { useReduceMotion } from "@/lib/use-reduce-motion";
import { colors, radii } from "@/constants/theme";

/**
 * A native iOS sheet for picking from a list mid-workout.
 *
 * Lists used to open inline, which pushed the circles down and off the
 * screen. A sheet slides over the workout instead, so nothing underneath
 * moves; swipe it down or press Cancel to leave without choosing.
 */
export function Sheet({
  visible,
  embedded = false,
  page,
  onBack,
  title,
  onClose,
  closeLabel = "Cancel",
  scrollEnabled = true,
  scrollKey,
  swipeToDismiss = true,
  full = false,
  children,
}: PropsWithChildren<{
  visible: boolean;
  /** A page inside an existing modal, with no modal of its own. */
  embedded?: boolean;
  /** A child page replaces the header and body while this modal stays mounted. */
  page?: ReactNode;
  onBack?: () => void;
  title: string;
  onClose: () => void;
  /** "Done" where edits apply as you make them; "Cancel" where you are picking. */
  closeLabel?: string;
  /** Frozen while a row inside is being dragged, or the drag scrolls the sheet. */
  scrollEnabled?: boolean;
  /** Reset scrolling when the sheet changes between a list, guide and settings. */
  scrollKey?: string;
  /** Let iOS dismiss this sheet with a downward swipe. */
  swipeToDismiss?: boolean;
  /**
   * Cover the whole screen. For a sheet with rows you drag: iOS's page sheet
   * has a swipe-down of its own that takes a vertical drag over once the
   * scroll is frozen, and the row is dropped. A full screen has none.
   */
  full?: boolean;
}>) {
  const reduce = useReduceMotion();
  const scroll = (
        <ScrollView
          key={scrollKey}
          scrollEnabled={scrollEnabled}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          // Keeps a field low in the sheet — a note under the weight — above the keyboard.
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40 }}
        >
          <Column>{children}</Column>
        </ScrollView>
  );
  const content = page ?? (
    <View style={{ flex: 1 }}>
        <Column
          style={{
            flexDirection: onBack ? "column" : "row",
            alignItems: onBack ? "stretch" : "center",
            gap: onBack ? 8 : 10,
            paddingHorizontal: 22,
            paddingTop: full ? 8 : 18,
            paddingBottom: 8,
          }}
        >
          {onBack ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack}
              style={({ pressed }) => ({ alignSelf: "flex-start", minWidth: 80, minHeight: 44, flexDirection: "row", gap: 6, alignItems: "center", opacity: pressed ? 0.5 : 1 })}>
              <Icon name="back" size={16} color={colors.text} />
              <Text ui style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>Back</Text>
            </Pressable>
          ) : null}
          <Text style={{ flex: onBack ? undefined : 1, color: colors.text, fontSize: onBack ? 24 : 20, fontWeight: "700" }}>
            {title}
          </Text>
          {onBack ? null : <Pressable
            accessibilityRole="button"
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => ({
              justifyContent: "center",
              minHeight: 44,
              paddingHorizontal: 4,
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Text ui
              style={{
                color: closeLabel === "Done" ? colors.text : colors.muted,
                fontSize: 16,
                fontWeight: "700",
              }}
            >
              {closeLabel}
            </Text>
          </Pressable>}
        </Column>
        {scroll}
    </View>
  );
  if (embedded) return content;
  return (
    <Modal
      visible={visible}
      animationType={reduce ? "fade" : "slide"}
      presentationStyle={full ? "fullScreen" : "pageSheet"}
      allowSwipeDismissal={swipeToDismiss && !full}
      onRequestClose={onBack ?? onClose}
    >
      <Plain>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <Clear full={full}>{content}</Clear>
        </SafeAreaProvider>
      </Plain>
    </Modal>
  );
}

/**
 * The sheet's body, kept clear of the clock and the notch when it covers the
 * whole screen. Inside a full-screen modal on a phone the measured top can
 * come back as 0, so it never goes below the top the app measured when it
 * started — the same phone, the same notch.
 */
function Clear({ full, children }: PropsWithChildren<{ full: boolean }>) {
  const insets = useSafeAreaInsets();
  const top = full ? Math.max(insets.top, initialWindowMetrics?.insets.top ?? 0) : 0;
  return <View style={{ flex: 1, paddingTop: top, backgroundColor: colors.bg }}>{children}</View>;
}

/** A small heading over a group in a sheet. */
export function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      ui
      style={{
        color: colors.muted,
        fontSize: 14,
        fontWeight: "600",
      }}
    >
      {children}
    </Text>
  );
}

/**
 * Long enough for one sheet to slide away before the next opens. iOS will
 * not show a sheet over one that is still leaving.
 */
export const SHEET_SWAP_MS = 450;

/** A full-width action at the foot of a sheet. */
export function BigButton({
  label,
  danger,
  quiet,
  disabled,
  onPress,
}: {
  label: string;
  /** The second tap of a removal. */
  danger?: boolean;
  /** The first tap of a removal. */
  quiet?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Button label={label} kind={danger ? "danger" : quiet ? "remove" : "primary"} disabled={disabled} onPress={onPress} />
  );
}

/** A quiet way out: "Cancel", "Keep it". Centred under the action it undoes. */
export function TextButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <LinkButton kind="quiet" label={label} disabled={disabled} onPress={onPress} />;
}

/**
 * A tappable row that opens something: a name, one detail, a chevron. Large
 * on the Plan lists themselves; standard inside a sheet.
 */
export function OpenRow({
  title,
  detail,
  tag,
  large,
  muted,
  onPress,
}: {
  title: string;
  detail?: string;
  /** A short marker on the right, like "Next". */
  tag?: string;
  large?: boolean;
  /** Something on its way out or not yet yours, like a library entry. */
  muted?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: large ? 84 : 64,
        paddingHorizontal: large ? 20 : 16,
        paddingVertical: 12,
        borderRadius: large ? radii.card : 18,
        borderCurve: "continuous",
        backgroundColor: colors.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text
          style={{
            color: muted ? colors.muted : colors.text,
            fontSize: large ? 21 : 17,
            fontWeight: large ? "700" : "600",
          }}
        >
          {title}
        </Text>
        {detail ? (
          <Text ui style={{ color: colors.faint, fontSize: large ? 14 : 13 }}>{detail}</Text>
        ) : null}
      </View>
      {tag ? (
        <Text
          style={{
            color: colors.rise,
            fontSize: 15,
            fontStyle: "italic",
          }}
        >
          {tag}
        </Text>
      ) : null}
      <Icon name="open" size={large ? 15 : 13} color={colors.faint} />
    </Pressable>
  );
}
