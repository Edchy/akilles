import { useRouter } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DayCard } from "@/app/index";
import { useBarSpace } from "@/components/bottom-bar";
import { Icon } from "@/components/icon";
import { COLUMN } from "@/components/screen";
import { OpenRow, SectionLabel } from "@/components/sheet";
import { Text } from "@/components/text";
import { colors, fonts, HEADLINES, LOOKS } from "@/constants/theme";
import { useLook } from "@/store/look";
import { upNext, useSession } from "@/store/session";

/**
 * The Lab: new looks for the cards, tried for real. Only the look changes —
 * what the cards show and what a tap does stay the same. Tap one and the
 * whole app wears it at once; it stays on this phone, test mode or not,
 * until another is picked here. Reached from Settings in test mode.
 */
export default function LabScreen() {
  const insets = useSafeAreaInsets();
  const barSpace = useBarSpace();
  const router = useRouter();
  const { state } = useSession();
  const { look, headline, wear } = useLook();
  const next = upNext(state);
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 22,
        width: "100%",
        maxWidth: COLUMN,
        alignSelf: "center",
        paddingBottom: barSpace + 28,
        gap: 14,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={() => router.back()}
        hitSlop={8}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          marginLeft: -10,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.5 : 1,
        })}
      >
        <Icon name="back" size={20} color={colors.text} />
      </Pressable>
      <Text accessibilityRole="header" style={{ color: colors.text, fontFamily: fonts.display, fontSize: 48 }}>
        Lab
      </Text>
      <Text style={{ color: colors.text, fontFamily: fonts.regular, fontSize: 19, lineHeight: 27 }}>
        Try a new look for the cards. Only the look changes, never what they show or do. Your phone keeps it, even
        outside test mode, until you pick another here. Your training is never touched.
      </Text>

      <View style={{ height: 6 }} />
      <SectionLabel>Looks</SectionLabel>
      {LOOKS.map((l) => (
        <OpenRow
          key={l.id}
          title={l.name}
          detail={l.line}
          tag={l.id === look ? "Wearing" : undefined}
          onPress={() => {
            if (l.id !== look) wear({ look: l.id });
          }}
        />
      ))}

      {look === "poster" ? (
        <>
          <View style={{ height: 6 }} />
          <SectionLabel>Poster headlines</SectionLabel>
          {HEADLINES.map((h) => (
            <OpenRow
              key={h.id}
              title={h.name}
              detail={h.line}
              tag={h.id === headline ? "Wearing" : undefined}
              onPress={() => {
                if (h.id !== headline) wear({ headline: h.id });
              }}
            />
          ))}
        </>
      ) : null}

      {next ? (
        <>
          <View style={{ height: 6 }} />
          <SectionLabel>Your next workout, in this look</SectionLabel>
          {/* The real card from Today, at Today's size, so it reads as it will there. */}
          <View style={{ height: 460 }}>
            <DayCard state={state} workout={next} />
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
