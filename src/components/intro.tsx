import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Image, Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { COLUMN } from "@/components/screen";
import { Text } from "@/components/text";
import { colors, fonts, radii } from "@/constants/theme";
import { Onboarding } from "@/components/onboarding";
import { seeIntro, useSession, wantsIntro, wantsOnboarding } from "@/store/session";

/**
 * Why Klay, and how a workout goes, as one short film (made in `video/`, see
 * its SCRIPT.md): move every day, like eating and sleeping; at the gym, now
 * what? Then Start, the circles, a short set, next time, swiping between the
 * cards, a stretch, Finish — drawn as the app draws them, with a finger. Said
 * aloud and captioned, so it works with the sound off.
 *
 * The rest — swap, warm-ups, the Library — is taught by a tip the first time
 * it comes up (see `tips.tsx`), not here.
 *
 * A new phone meets the film in the onboarding, after the two questions (see
 * `onboarding.tsx`). This modal shows it again from Settings, and opens by
 * itself only on a phone that trained before the onboarding existed and never
 * saw it. Skip is always there.
 */

const Open = createContext<() => void>(() => {});

/** Open the intro again, from Settings. */
export const useOpenIntro = () => useContext(Open);

/** The intro over everything, the bar included, when it is wanted. */
export function IntroProvider({ children }: { children: ReactNode }) {
  const { state, setState } = useSession();
  const [again, setAgain] = useState(false);
  // The plan's questions come first; the intro follows them.
  const asking = wantsOnboarding(state);
  const first = wantsIntro(state) && !asking;

  return (
    <Open.Provider value={() => setAgain(true)}>
      {children}
      <Onboarding />
      <Intro
        visible={first || again}
        again={!first}
        onDone={() => {
          setAgain(false);
          setState((s) => seeIntro(s));
        }}
      />
    </Open.Provider>
  );
}

function Intro({ visible, again, onDone }: { visible: boolean; again: boolean; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType={again ? "slide" : "fade"} presentationStyle="fullScreen" onRequestClose={onDone}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={{ height: 44, paddingHorizontal: 16, alignItems: "flex-end", justifyContent: "center" }}>
          <Pressable
            accessibilityRole="button"
            onPress={onDone}
            hitSlop={8}
            style={({ pressed }) => ({ minWidth: 44, minHeight: 44, justifyContent: "center", opacity: pressed ? 0.5 : 1 })}
          >
            <Text style={{ color: colors.muted, fontFamily: fonts.regular, fontSize: 18 }}>{again ? "Close" : "Skip"}</Text>
          </Pressable>
        </View>
        {visible ? <IntroFilm /> : null}
        <View
          style={{
            width: "100%",
            maxWidth: COLUMN,
            alignSelf: "center",
            paddingHorizontal: 22,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 16),
          }}
        >
          <MainButton label={again ? "Done" : "Get started"} onPress={onDone} />
        </View>
      </View>
    </Modal>
  );
}

/** The film itself (assets/video/intro.mp4, from `video/`). */
const FILM = require("../../assets/video/intro.mp4");

/**
 * The film, playing as soon as it shows, on the page's own white so it reads
 * as part of the page. A tap pauses or plays; once it has run, "Watch again".
 */
export function IntroFilm() {
  const player = useVideoPlayer(FILM, (p) => {
    p.loop = false;
    p.play();
  });
  const [ended, setEnded] = useState(false);
  const [paused, setPaused] = useState(false);
  useEventListener(player, "playToEnd", () => setEnded(true));
  // Stop the sound the moment the film leaves the screen.
  useEffect(() => () => player.pause(), [player]);

  const again = () => {
    player.currentTime = 0;
    player.play();
    setEnded(false);
    setPaused(false);
  };
  const toggle = () => {
    if (ended) return again();
    if (player.playing) player.pause();
    else player.play();
    setPaused(!player.playing);
  };

  return (
    <View style={{ flex: 1 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ended ? "Watch again" : paused ? "Play" : "Pause"}
        onPress={toggle}
        style={{ flex: 1 }}
      >
        <VideoView
          player={player}
          contentFit="contain"
          nativeControls={false}
          style={{ flex: 1, backgroundColor: colors.bg }}
          pointerEvents="none"
        />
      </Pressable>
      {ended || paused ? (
        <Pressable
          accessibilityRole="button"
          onPress={ended ? again : toggle}
          hitSlop={8}
          style={({ pressed }) => ({
            position: "absolute",
            alignSelf: "center",
            bottom: 12,
            minHeight: 44,
            paddingHorizontal: 18,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <Text style={{ color: colors.text, fontFamily: fonts.medium, fontSize: 19 }}>{ended ? "Watch again" : "Play"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** The one big button under the film. */
export function MainButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        height: 60,
        borderRadius: radii.action,
        borderCurve: "continuous",
        backgroundColor: colors.text,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text style={{ color: colors.white, fontFamily: fonts.medium, fontSize: 21 }}>{label}</Text>
      <Icon name="forward" size={18} color={colors.white} />
    </Pressable>
  );
}

/** The clay fellow saying hello (see art/clay/scenes.json). */
export const HELLO = require("../../assets/clay/hello.jpg");

/** One of the clay fellow's pictures, 3:2, on the page's own white. */
export function ClayPicture({ source, width = 330 }: { source: number; width?: number }) {
  return <Image source={source} resizeMode="contain" style={{ width, height: (width * 2) / 3 }} />;
}
