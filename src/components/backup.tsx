import { useEffect, useState } from "react";
import { Button } from "@/components/buttons";
import { Pressable, View } from "react-native";
import { Text } from "@/components/text";

import { colors } from "@/constants/theme";
import { exportBackup, pickBackup } from "@/store/backup";
import { dailyCopies, keepAside, type DailyCopy } from "@/store/storage";
import { resetToDefault, useSession, type SessionState } from "@/store/session";
import { useTestMode } from "@/store/test-mode";

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
  const { on: testing } = useTestMode();
  // The phone's own copies, one a day, made without asking.
  const [copies, setCopies] = useState<DailyCopy[]>([]);
  // Where the waiting restore came from, for the question asked about it.
  const [source, setSource] = useState<"backup" | "copy">("backup");
  useEffect(() => {
    if (!testing) dailyCopies().then(setCopies);
  }, [testing]);

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
      if (read === "invalid") return setNote("That file isn't a Klay backup.");
      if (read === "newer") {
        return setNote("That backup is from a newer version of the app. Update first.");
      }
      setSource("backup");
      setPending(read);
    });

  // A backup made now would hold the test, and putting one back would only
  // reach the test — neither is what Backup is for.
  if (testing) {
    return (
      <View style={{ gap: 14, paddingTop: 8 }}>
        <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>
          Backup is off in test mode, so a test never ends up in a backup. Leave test mode to save
          or put back your real training.
        </Text>
      </View>
    );
  }

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
            Replace everything on this phone with this {source}?
            What is here now is replaced.
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Action label="Cancel" onPress={() => setPending(null)} />
            <Action
              label="Replace"
              tone="danger"
              onPress={() => {
                void keepAside(state);
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

      {copies.length && !pending && !resetting ? (
        <View style={{ gap: 4, marginTop: 10 }}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>Earlier copies</Text>
          <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 6 }}>
            The phone keeps a copy of your training each day, for two weeks. Tap one to go back to it.
          </Text>
          {copies.map((c) => (
            <Pressable
              key={c.day}
              accessibilityRole="button"
              accessibilityLabel={`${dayName(c.day)}, ${workoutsLabel(c.workouts)}`}
              onPress={() => {
                setNote(null);
                setSource("copy");
                setPending(c.state);
              }}
              style={({ pressed }) => ({
                minHeight: 48,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                borderTopWidth: 1,
                borderTopColor: colors.line,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: colors.text, fontSize: 17 }}>{dayName(c.day)}</Text>
              <Text style={{ color: colors.muted, fontSize: 15 }}>{workoutsLabel(c.workouts)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const workoutsLabel = (n: number) => (n === 1 ? "1 workout" : `${n} workouts`);

/** "Today", "Yesterday", or "Sat 14 Nov". */
function dayName(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ago = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  if (ago === 0) return "Today";
  if (ago === 1) return "Yesterday";
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
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
  const kind = tone === "primary" ? "primary" : tone === "danger" ? "danger" : "secondary";
  return <Button label={label} kind={kind} disabled={disabled} flex={1} onPress={onPress} />;
}
