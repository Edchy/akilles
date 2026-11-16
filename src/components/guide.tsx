import { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { Text } from "@/components/text";

import { useColors } from "@/components/field";
import { Icon } from "@/components/icon";
import { hasIllustration, Illustration } from "@/components/illustration";
import { Sheet } from "@/components/sheet";
import { colors, fonts, radii } from "@/constants/theme";
import { guideFor } from "@/data/guides";

/**
 * The ⓘ beside a movement's name, and the sheet it opens: the picture, how to
 * do it in a few steps, and the one thing to watch for. The same round button
 * as swap beside it, so the two sit as a pair.
 */
export function GuideButton({
  id,
  name,
  cue,
  size = 44,
  onPicture,
}: {
  id: string;
  name: string;
  /** The movement's own one-liner, used where no guide has been written. */
  cue?: string;
  size?: number;
  /** Sitting on an illustration: a white disc so it stands off the picture. */
  onPicture?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // On the lift screen this sits on the family's colour: a tint of it.
  const field = useColors();

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`How to do ${name}`}
        onPress={() => setOpen(true)}
        hitSlop={size < 44 ? (44 - size) / 2 : 0}
        style={({ pressed }) => ({
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          // On a field, a tint of it; on white, a step darker than the grey
          // panels it usually sits in (a sheet's list), or it disappears.
          backgroundColor: onPicture ? colors.bg : field === colors ? colors.raised : field.surface,
          // Over a photo, a white circle can vanish into a white wall: lift it.
          boxShadow: onPicture ? "0 1px 6px rgba(8, 28, 60, 0.22)" : undefined,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Icon name="info" size={size * 0.5} color={onPicture ? colors.text : field.text} />
      </Pressable>

      <GuideSheet visible={open} id={id} name={name} cue={cue} onClose={() => setOpen(false)} />
    </>
  );
}

/** The how-to on its own, for opening from elsewhere: the lift screen's ⋯. */
export function GuideSheet({
  visible,
  id,
  name,
  cue,
  onClose,
}: {
  visible: boolean;
  id: string;
  name: string;
  cue?: string;
  onClose: () => void;
}) {
  return (
    <Sheet visible={visible} title={name} closeLabel="Done" onClose={onClose}>
      <Guide id={id} cue={cue} />
    </Sheet>
  );
}

export function Guide({ id, cue }: { id: string; cue?: string }) {
  const guide = guideFor(id);

  return (
    <View style={{ gap: 22, paddingTop: 8, width: "100%", maxWidth: 640, alignSelf: "center" }}>
      {hasIllustration(id) ? <Illustration
        id={id}
        style={{ height: 240, borderRadius: radii.card, borderCurve: "continuous" }}
      /> : guide?.demonstration ? <ReferenceDemonstration key={id} source={guide.demonstration} /> : null}

      {guide ? <GuideInstructions key={id} id={id} /> : (
        <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 23 }}>
          {cue ?? "No guide for this one yet."}
        </Text>
      )}
    </View>
  );
}

function ReferenceDemonstration({ source }: { source: { title: string; url: string } }) {
  const [failed, setFailed] = useState(false);
  return <View style={{ gap: 8 }}>
    <Pressable accessibilityRole="link" accessibilityLabel={`See the movement: ${source.title}. Opens in your browser.`}
      onPress={() => { setFailed(false); void Linking.openURL(source.url).catch(() => setFailed(true)); }}
      style={({ pressed }) => ({ minHeight: 64, padding: 20, borderRadius: 20, backgroundColor: colors.surface,
        flexDirection: "row", alignItems: "center", gap: 16, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text ui style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>See the movement</Text>
        <Text ui style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>{source.title} · Opens in browser</Text>
      </View>
      <Icon name="forward" size={20} color={colors.text} />
    </Pressable>
    {failed ? <Text ui accessibilityRole="alert" style={{ color: colors.danger, fontSize: 14 }}>Couldn’t open the demonstration. Please try again.</Text> : null}
  </View>;
}

/** Shared by the guide sheet and the mobility library, so advice reads consistently. */
export function GuideInstructions({ id }: { id: string }) {
  const guide = guideFor(id);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [sourceError, setSourceError] = useState(false);
  if (!guide) return null;
  return (
    <View style={{ gap: 24 }}>
      <View>
        {guide.steps.map((step, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 16, alignItems: "flex-start", paddingVertical: 18,
            borderBottomWidth: i < guide.steps.length - 1 ? 1 : 0, borderBottomColor: colors.line }}>
            <Text accessibilityElementsHidden importantForAccessibility="no" style={{ width: 30, color: colors.text, fontFamily: fonts.bold, fontSize: 32, lineHeight: 34 }}>{i + 1}</Text>
            <View style={{ flex: 1, gap: 5 }}>
              {guide.stepTitles?.[i] ? <Text ui style={{ color: colors.text, fontSize: 17, lineHeight: 23, fontWeight: "700" }}>{guide.stepTitles[i]}</Text> : null}
              <Text style={{ color: colors.text, fontSize: 17, lineHeight: 24, fontWeight: guide.stepTitles?.[i] ? "400" : "700" }}>{step}</Text>
            </View>
          </View>
        ))}
      </View>
      {guide.own ? (
        <View style={{ gap: 8, padding: 20, borderRadius: 20, backgroundColor: colors.surface }}>
          <Text ui accessibilityRole="header" style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>Own it</Text>
          <Text style={{ color: colors.text, fontSize: 18, lineHeight: 25 }}>{guide.own}</Text>
        </View>
      ) : null}
      <View style={{ gap: 10, borderRadius: 20, borderCurve: "continuous", backgroundColor: colors.text, padding: 20 }}>
        <Text ui accessibilityRole="header" style={{ color: colors.white, fontSize: 18, fontWeight: "700" }}>Watch out</Text>
        <Text style={{ color: colors.white, fontSize: 18, lineHeight: 25 }}>{guide.avoid}</Text>
      </View>
      {guide.sources?.length ? (
        <View style={{ gap: 4 }}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: sourcesOpen }}
            onPress={() => setSourcesOpen((open) => !open)} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Text ui style={{ color: colors.muted, fontSize: 15, fontWeight: "600" }}>Technique sources</Text>
            <Icon name={sourcesOpen ? "minus" : "plus"} color={colors.muted} size={18} />
          </Pressable>
          {sourcesOpen ? <>
            {guide.own ? <Text ui style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>The pause and control cues are Humbell’s coaching approach.</Text> : null}
            {guide.sources.map((source) => <Pressable key={source.url} accessibilityRole="link" accessibilityLabel={`Open ${source.title}`}
              onPress={() => { setSourceError(false); void Linking.openURL(source.url).catch(() => setSourceError(true)); }}
              style={{ minHeight: 44, justifyContent: "center", paddingVertical: 8 }}>
              <Text ui style={{ color: colors.rise, fontSize: 15, lineHeight: 21, textDecorationLine: "underline" }}>{source.title}</Text>
            </Pressable>)}
            {sourceError ? <Text ui accessibilityRole="alert" style={{ color: colors.danger, fontSize: 14 }}>Couldn’t open the source. Please try again.</Text> : null}
          </> : null}
        </View>
      ) : null}
    </View>
  );
}
