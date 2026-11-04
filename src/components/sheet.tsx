import type { PropsWithChildren } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/text";

import { Plain } from "@/components/field";
import { Column } from "@/components/screen";
import { Icon } from "@/components/icon";
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
  title,
  onClose,
  closeLabel = "Cancel",
  scrollEnabled = true,
  swipeToDismiss = false,
  children,
}: PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose: () => void;
  /** "Done" where edits apply as you make them; "Cancel" where you are picking. */
  closeLabel?: string;
  /** Frozen while a row inside is being dragged, or the drag scrolls the sheet. */
  scrollEnabled?: boolean;
  /** Let iOS dismiss this sheet with a downward swipe. */
  swipeToDismiss?: boolean;
}>) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      allowSwipeDismissal={swipeToDismiss}
      onRequestClose={onClose}
    >
      {/* White, whatever colour the screen behind it is. */}
      <Plain>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Column
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 22,
            paddingTop: 18,
            paddingBottom: 8,
          }}
        >
          <Text style={{ flex: 1, color: colors.text, fontSize: 20, fontWeight: "700" }}>
            {title}
          </Text>
          <Pressable
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
            <Text
              style={{
                color: closeLabel === "Done" ? colors.text : colors.muted,
                fontSize: 16,
                fontWeight: "700",
              }}
            >
              {closeLabel}
            </Text>
          </Pressable>
        </Column>
        <ScrollView
          scrollEnabled={scrollEnabled}
          keyboardShouldPersistTaps="handled"
          // Keeps a field low in the sheet — a note under the weight — above the keyboard.
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40 }}
        >
          <Column>{children}</Column>
        </ScrollView>
      </View>
      </Plain>
    </Modal>
  );
}

/** A small heading over a group in a sheet. */
export function SectionLabel({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: colors.faint,
        fontSize: 15,
        fontStyle: "italic",
      }}
    >
      {children}
    </Text>
  );
}

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
  /** Present but not inviting: the first tap of a removal. */
  quiet?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        justifyContent: "center",
        minHeight: 56,
        borderRadius: radii.button,
        borderCurve: "continuous",
        backgroundColor: danger ? colors.bend : quiet ? "transparent" : colors.raised,
        borderWidth: quiet ? 1 : 0,
        borderColor: colors.line,
        opacity: disabled ? 0.3 : pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          color: danger ? colors.ink : quiet ? colors.bend : colors.text,
          fontSize: 16,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** A quiet way out: "Cancel", "Keep it". Centred under the action it undoes. */
export function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        alignSelf: "center",
        justifyContent: "center",
        minHeight: 48,
        paddingHorizontal: 20,
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Text style={{ color: colors.muted, fontSize: 15, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
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
          <Text style={{ color: colors.faint, fontSize: large ? 14 : 13 }}>{detail}</Text>
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
      <Icon name="open" size={large ? 15 : 13} color={colors.faint} weight="semibold" />
    </Pressable>
  );
}
