import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLUMN } from "@/components/screen";
import { colors, radii } from "@/constants/theme";
import { byId } from "@/data/exercises";
import { ladderFor, type Scheme } from "@/data/split";
import { weightLabel } from "@/lib/warmup";
import { exportBackup, pickBackup } from "@/store/backup";
import { resetToDefault, useSession, type SessionState } from "@/store/session";

const serif = process.env.EXPO_OS === "ios" ? "Georgia" : "serif";

export default function HistoryScreen() {
  const { state } = useSession();
  const insets = useSafeAreaInsets();

  // One row per exercise+scheme we've actually trained.
  const rows = Object.entries(state.history)
    .filter(([, st]) => st.lastPerformed || st.skippedLast)
    .map(([k, st]) => {
      const [, scheme] = k.split(":");
      return { key: k, scheme, state: st, exercise: byId(st.exerciseId)! };
    })
    .sort((a, b) => a.exercise.name.localeCompare(b.exercise.name));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 28,
        paddingHorizontal: 22,
        width: "100%",
        maxWidth: COLUMN,
        alignSelf: "center",
        paddingBottom: 28,
        gap: 22,
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontFamily: serif,
          fontSize: 40,
          fontWeight: "700",
          letterSpacing: -1.5,
        }}
      >
        History
      </Text>

      {rows.length === 0 ? (
        <Text style={{ color: colors.faint, fontSize: 15, lineHeight: 22 }}>
          Nothing logged yet. Finish an exercise and its weights show up here.
        </Text>
      ) : (
        <View style={{ gap: 2 }}>
          {rows.map(({ key, scheme, state: st, exercise }, i) => {
            const last = st.lastPerformed;
            const ladder = ladderFor(scheme as Scheme);
            const target = ladder[Math.min(st.rung, ladder.length - 1)];
            return (
              <View
                key={key}
                style={{
                  gap: 5,
                  borderBottomWidth: i === rows.length - 1 ? 0 : 1,
                  borderBottomColor: colors.line,
                  paddingVertical: 15,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text
                    style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: "600" }}
                  >
                    {exercise.name}
                  </Text>
                  <Text
                    style={{
                      color: colors.faint,
                      fontSize: 11,
                      fontWeight: "800",
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                    }}
                  >
                    {scheme}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Text
                    style={{
                      color: colors.acid,
                      fontSize: 15,
                      fontWeight: "800",
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {weightLabel(exercise, st.weight)}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 14 }}>
                    next {target} reps
                  </Text>
                  <Text
                    style={{
                      marginLeft: "auto",
                      color: st.skippedLast ? colors.coral : colors.faint,
                      fontSize: 13,
                      fontVariant: ["tabular-nums"],
                    }}
                  >
                    {st.skippedLast
                      ? "skipped"
                      : `last ${last!.reps.join(" ")}${
                          last!.feedback === "up"
                            ? "  👍"
                            : last!.feedback === "down"
                              ? "  👎"
                              : ""
                        }`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Backup />
    </ScrollView>
  );
}

/**
 * Save everything to a file, or put it back from one. The data otherwise
 * lives only on this phone — see `store/backup.ts`.
 */
function Backup() {
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
      if (read === "invalid") return setNote("That file isn't an Akilles backup.");
      if (read === "newer") {
        return setNote("That backup is from a newer version of the app. Update first.");
      }
      setPending(read);
    });

  return (
    <View
      style={{
        gap: 12,
        marginTop: 12,
        borderRadius: radii.card,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.line,
        padding: 16,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 19, fontWeight: "700" }}>Backup</Text>
      <Text style={{ color: colors.faint, fontSize: 13, lineHeight: 19 }}>
        Your training lives only on this phone. Save a backup to Files or iCloud
        Drive now and then, and you can put everything back if the app is ever
        reset.
      </Text>

      {resetting ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: colors.coral, fontSize: 14, lineHeight: 20, fontWeight: "600" }}>
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
          <Text style={{ color: colors.coral, fontSize: 14, lineHeight: 20, fontWeight: "600" }}>
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
  const fill = tone === "primary" ? colors.acid : tone === "danger" ? colors.coral : colors.raised;
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
