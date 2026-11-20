/**
 * Test mode: a second, separate copy of the app's training, for trying
 * things out on your own phone. While it is on, your real training is
 * neither read nor written — see `Profile` in `storage.ts` — and a strip
 * across the top of every screen says so.
 */

import { createContext, useContext } from "react";
import { Platform } from "react-native";

/**
 * Test mode is the owner's: in Expo Go and from the Mac. The web version,
 * the one friends try, never offers it.
 */
export const TEST_MODE_OFFERED = !(Platform.OS === "web" && !(typeof __DEV__ !== "undefined" && __DEV__));

/**
 * How test mode starts: like a new phone (the intro, the starting program,
 * nothing trained), with a copy of your real training, or where it was left.
 */
export type TestStart = "fresh" | "copy" | "resume";

export type TestModeValue = {
  /** Whether test mode's training is the one on screen. */
  on: boolean;
  /** Turn test mode on, or start it over. */
  start: (from: TestStart) => Promise<void>;
  /** Back to your real training, exactly as it was. Test mode's is kept. */
  leave: () => Promise<void>;
  /** Running from the Mac: test mode is always on, with no way out. */
  fixed: boolean;
};

export const TestModeContext = createContext<TestModeValue>({
  on: false,
  start: async () => {},
  leave: async () => {},
  fixed: false,
});

export const useTestMode = (): TestModeValue => useContext(TestModeContext);
