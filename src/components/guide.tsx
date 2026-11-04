import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/text";

import { useColors } from "@/components/field";
import { Icon } from "@/components/icon";
import { Illustration } from "@/components/illustration";
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

function Guide({ id, cue }: { id: string; cue?: string }) {
  const guide = guideFor(id);

  return (
    <View style={{ gap: 22, paddingTop: 8 }}>
      <Illustration
        id={id}
        style={{ height: 240, borderRadius: radii.card, borderCurve: "continuous" }}
      />

      {guide ? (
        <>
          <View style={{ gap: 14 }}>
            {guide.steps.map((step, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.rise,
                  }}
                >
                  <Text style={{ color: colors.ink, fontFamily: fonts.displayBold, fontSize: 17 }}>
                    {i + 1}
                  </Text>
                </View>
                <Text style={{ flex: 1, color: colors.text, fontSize: 16, lineHeight: 23, paddingTop: 3 }}>
                  {step}
                </Text>
              </View>
            ))}
          </View>

          {guide.own ? (
            <View style={{ gap: 4, paddingHorizontal: 16 }}>
              <Text style={{ color: colors.rise, fontSize: 15, fontStyle: "italic" }}>Own it</Text>
              <Text style={{ color: colors.text, fontSize: 16, lineHeight: 23 }}>{guide.own}</Text>
            </View>
          ) : null}

          <View
            style={{
              gap: 4,
              borderRadius: radii.card - 8,
              borderCurve: "continuous",
              backgroundColor: colors.surface,
              padding: 16,
            }}
          >
            <Text
              style={{
                color: colors.bend,
                fontSize: 15,
                fontStyle: "italic",
              }}
            >
              Watch out
            </Text>
            <Text style={{ color: colors.bend, fontSize: 15, lineHeight: 22 }}>{guide.avoid}</Text>
          </View>
        </>
      ) : (
        <Text style={{ color: colors.muted, fontSize: 16, lineHeight: 23 }}>
          {cue ?? "No guide for this one yet."}
        </Text>
      )}
    </View>
  );
}
