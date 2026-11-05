import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/text";

import { colors } from "@/constants/theme";
import { exportBackup, pickBackup } from "@/store/backup";
import { resetToDefault, useSession, type SessionState } from "@/store/session";

/**
 * Save everything to a file, or put it back from one. The data otherwise
 * lives only on this phone — see `store/backup.ts`.
 */
export function Backup() {
  const { state, setState } = useSession();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // A backup that has been read and checked, waiting for the second tap.
  const [pending, setPending] = useState<SessionState | null>(null);
  // Reset asked for once, waiting for the second tap.
  const [resetting, setResetting] = useState(false);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setNote(null);
    try {
      await task();
    } catch {
      setNote("Something went wrong. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  };

  const save = () => run(() => exportBackup(state));

  const open = () =>
    run(async () => {
      const read = await pickBackup();
      if (read === null) return;
      if (read === "invalid") return setNote("That file isn't an Milo backup.");
      if (read === "newer") {
        return setNote("That backup is from a newer version of the app. Update first.");
      }
      setPending(read);
    });

  return (
    <View style={{ gap: 14, paddingTop: 8 }}>
      <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
        Your training lives only on this phone. Save a backup to Files or iCloud
        Drive now and then, and you can put everything back if the app is ever
        reset.
      </Text>

      {resetting ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.bend, fontSize: 14, lineHeight: 20, fontWeight: "600" }}>
            Reset everything to how the app first starts? Your workouts, exercises,
            edits and history on this phone are all replaced.
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Action label="Cancel" onPress={() => setResetting(false)} />
            <Action
              label="Reset"
              tone="danger"
              onPress={() => {
                setState(resetToDefault());
                setResetting(false);
                setNote("Reset to the starting program.");
              }}
            />
          </View>
        </View>
      ) : pending ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.bend, fontSize: 14, lineHeight: 20, fontWeight: "600" }}>
            Replace everything on this phone with this backup? What is here now
            is lost.
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Action label="Cancel" onPress={() => setPending(null)} />
            <Action
              label="Replace"
              tone="danger"
              onPress={() => {
                setState(pending);
                setPending(null);
                setNote("Restored.");
              }}
            />
          </View>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Action label="Save backup" tone="primary" disabled={busy} onPress={save} />
            <Action label="Restore" disabled={busy} onPress={open} />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setNote(null);
              setResetting(true);
            }}
            style={({ pressed }) => ({
              alignItems: "center",
              justifyContent: "center",
              minHeight: 44,
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Text style={{ color: colors.faint, fontSize: 14, fontWeight: "700" }}>
              Reset to default
            </Text>
          </Pressable>
        </View>
      )}

      {note ? <Text style={{ color: colors.muted, fontSize: 13 }}>{note}</Text> : null}
    </View>
  );
}

function Action({
  label,
  tone = "plain",
  disabled = false,
  onPress,
}: {
  label: string;
  tone?: "plain" | "primary" | "danger";
  disabled?: boolean;
  onPress: () => void;
}) {
  const fill = tone === "primary" ? colors.rise : tone === "danger" ? colors.bend : colors.raised;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 48,
        borderRadius: 999,
        backgroundColor: fill,
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{
          color: tone === "plain" ? colors.text : colors.ink,
          fontSize: 14,
          fontWeight: "800",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
