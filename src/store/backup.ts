/**
 * Backups: your whole training as one file you keep somewhere safe.
 *
 * The app's data lives only on this phone. A backup is the same text the app
 * saves to disk, written to a file and handed to the share sheet — "Save to
 * Files" puts it in iCloud Drive. Restoring reads it back through the same
 * migrations as launch, so a backup from an older version still restores.
 */

import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import type { SessionState } from "@/store/session";
import { fromSaved, toSaved, type Unreadable } from "@/store/storage";

/** "akilles-2026-09-23.json" — the date sorts, and says which backup is which. */
const fileName = (now: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `akilles-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
};

/**
 * Write a backup and open the share sheet on it. Resolves once the sheet
 * closes — whether or not you saved it anywhere, which the app cannot know.
 */
export const exportBackup = async (state: SessionState): Promise<void> => {
  const file = new File(Paths.cache, fileName(new Date()));
  file.create({ overwrite: true });
  file.write(toSaved(state));
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    UTI: "public.json",
    dialogTitle: "Save your Akilles backup",
  });
};

/**
 * Pick a backup file and read it. `null` if you cancelled the picker; the
 * reason as a string if the file is not a backup this app can read.
 * Nothing is replaced here — the caller decides, after asking.
 */
export const pickBackup = async (): Promise<SessionState | Unreadable | null> => {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "public.json", "public.text", "text/plain"],
    copyToCacheDirectory: true,
  });
  if (picked.canceled) return null;
  const asset = picked.assets[0];
  try {
    // On the web the picker hands back the browser's own file, and
    // expo-file-system does not run there at all.
    const text = asset.file ? await asset.file.text() : await new File(asset.uri).text();
    return fromSaved(text);
  } catch {
    return "invalid";
  }
};
