import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

/**
 * The sounds of a routine that runs itself, so it can be followed with the
 * phone on the floor and never looked at:
 *
 * - `start`: one soft note — hold now.
 * - `end`: two notes rising — the hold is over; change side, or the move is done.
 * - `finish`: three notes rising — the whole routine is done.
 *
 * Calm, low, soft-edged notes like a small singing bowl, made by
 * scripts/sounds.mjs: a nudge, never a fright.
 *
 * They play on a phone set to silent, as a timer should, and only lower
 * music for their moment rather than stopping it. Never throws: a sound that
 * cannot play is simply not heard, and the buzz that goes with it still says
 * the same thing.
 */
export type Cue = "start" | "end" | "finish";

const SOURCES: Record<Cue, number> = {
  start: require("../../assets/sounds/hold-start.wav"),
  end: require("../../assets/sounds/hold-done.wav"),
  finish: require("../../assets/sounds/routine-done.wav"),
};

const players: Partial<Record<Cue, AudioPlayer>> = {};
let ready = false;

export function cue(which: Cue) {
  try {
    if (!ready) {
      ready = true;
      setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "duckOthers" }).catch(() => {});
    }
    const player = (players[which] ??= createAudioPlayer(SOURCES[which]));
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // Heard or not, the haptic carries it.
  }
}

/** The end of a hold. */
export const chime = () => cue("end");
