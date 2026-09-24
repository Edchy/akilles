import type { PropsWithChildren } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { Column } from "@/components/screen";
import { colors } from "@/constants/theme";

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
  children,
}: PropsWithChildren<{ visible: boolean; title: string; onClose: () => void }>) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
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
            <Text style={{ color: colors.muted, fontSize: 16, fontWeight: "700" }}>Cancel</Text>
          </Pressable>
        </Column>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40 }}>
          <Column>{children}</Column>
        </ScrollView>
      </View>
    </Modal>
  );
}
