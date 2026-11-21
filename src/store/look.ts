/**
 * The look this phone wears (see `LookId` in theme.ts): chosen in the Lab,
 * kept on the phone under its own key, never in the training save — so a
 * look can't touch your history, and a backup never carries one.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext } from "react";

import { applyLook, HEADLINES, LOOKS, type HeadlineId, type LookId } from "@/constants/theme";

const KEY = "achilles/look";
/** Poster's headline face (see `HEADLINES`). */
const HEADLINE_KEY = "achilles/headline";

export type Worn = { look: LookId; headline: HeadlineId };

/** Read the look back and wear it. Anything unknown or unreadable is Dusk, in Anton. */
export async function loadLook(): Promise<Worn> {
  let look: LookId = "dusk";
  let headline: HeadlineId = "anton";
  try {
    const [saved, face] = await Promise.all([AsyncStorage.getItem(KEY), AsyncStorage.getItem(HEADLINE_KEY)]);
    look = LOOKS.find((l) => l.id === saved)?.id ?? "dusk";
    headline = HEADLINES.find((h) => h.id === face)?.id ?? "anton";
  } catch {}
  applyLook(look, headline);
  return { look, headline };
}

/** Wear a look and keep it. The caller draws the app again. */
export async function saveLook({ look, headline }: Worn): Promise<void> {
  applyLook(look, headline);
  try {
    await Promise.all([AsyncStorage.setItem(KEY, look), AsyncStorage.setItem(HEADLINE_KEY, headline)]);
  } catch {}
}

export type LookValue = Worn & { wear: (next: Partial<Worn>) => void };

export const LookContext = createContext<LookValue>({ look: "dusk", headline: "anton", wear: () => {} });

export const useLook = (): LookValue => useContext(LookContext);
