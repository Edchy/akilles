import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLUMN } from "@/components/screen";
import { BigButton, Sheet } from "@/components/sheet";
import { Text, TextInput } from "@/components/text";
import { colors, fonts } from "@/constants/theme";
import { logCoreSet } from "@/store/core";
import {
  allSetsLogged, cardName, currentPrescription, currentWorkout, editWeight,
  didTrain, finishWorkout, goToCard, isLift, partnerPrescription, useSession,
} from "@/store/session";

/** One exercise, explicit logging, and a visible way to leave. */
export default function WorkoutScreen() {
  const { state } = useSession();
  const active = state.active;
  if (!active || active.cursor >= active.items.length) return <Finish />;
  return <Exercise key={`${active.startedAt}:${active.cursor}`} />;
}

function Exercise() {
  const { state, setState } = useSession();
  const insets = useSafeAreaInsets();
  const active = state.active!;
  const item = active.items[active.cursor];
  const prescription = currentPrescription(state);
  const partner = partnerPrescription(state);
  const [editingPartner, setEditingPartner] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [count, setCount] = useState("");
  const [weight, setWeight] = useState(String(item.weight));
  const [actions, setActions] = useState(false);
  const parsed = Number(count);
  const valid = /^\d+$/.test(count) && Number.isInteger(parsed) && parsed <= 999;
  const ex = prescription?.exercise;
  const unit = ex?.timed ? "seconds" : "reps";
  const editingUnit = editingPartner && partner?.exercise.timed ? "seconds" : editingPartner ? "reps" : unit;
  const done = allSetsLogged(state);
  const saveWeight = () => {
    const value = Number(weight.trim().replace(",", "."));
    if (weight.trim() && Number.isFinite(value) && (ex?.assistable || value >= 0)) {
      const normalized = editWeight(state, value).active!.items[active.cursor].weight;
      setWeight(String(normalized));
      setState((s) => editWeight(s, value));
    } else setWeight(String(item.weight));
  };
  return (
    <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1, width: "100%", maxWidth: COLUMN, alignSelf: "center", paddingHorizontal: 24, paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 20) + 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <Pressable accessibilityRole="button" onPress={() => router.replace("/")} style={{ minHeight: 48, justifyContent: "center" }}><Text style={{ color: colors.text, fontSize: 19 }}>Save & leave</Text></Pressable>
        <Text style={{ color: colors.muted, fontSize: 17 }}>{active.cursor + 1} of {active.items.length}</Text>
      </View>
      <View style={{ flex: 1, paddingVertical: 32, gap: 28 }}>
        <Text accessibilityRole="header" style={{ color: colors.text, fontFamily: fonts.display, fontSize: 40, lineHeight: 46 }}>{cardName(state, active.cursor)}</Text>
        {prescription ? <>
          {!ex?.unloaded && !ex?.timed ? <View style={{ gap: 8 }}>
            <Text style={{ color: colors.muted, fontSize: 18 }}>{ex?.holds ? "Hold at the hardest point" : "Weight for today"}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <TextInput accessibilityLabel={ex?.holds ? "Hold in seconds" : "Weight in kilograms"} value={weight} onChangeText={setWeight} onBlur={saveWeight} onSubmitEditing={saveWeight} selectTextOnFocus keyboardType={ex?.assistable ? "numbers-and-punctuation" : "decimal-pad"} returnKeyType="done" style={{ flex: 1, minHeight: 72, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 16, color: colors.text, fontFamily: fonts.semibold, fontSize: 42 }} />
              <Text style={{ color: colors.text, fontSize: 20 }}>{ex?.holds ? "seconds" : ex?.perHand ? "kg / hand" : "kg"}</Text>
            </View>
          </View> : null}
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.text, fontSize: 22 }}>{prescription.sets} sets of {prescription.reps} {unit}</Text>
            <Text style={{ color: colors.muted, fontSize: 17 }}>Log how many you completed after each set.</Text>
          </View>
          <View style={{ gap: 10 }}>
            {item.logged.map((value, i) => <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Set ${i + 1}, ${value === null ? `target ${prescription.reps} ${unit}. Log set` : `${value} ${unit} logged. Edit set`}`} onPress={() => { setEditingPartner(false); setCount(String(value ?? prescription.reps)); setEditing(i); }} style={({ pressed }) => ({ minHeight: 64, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 18, borderRadius: 14, backgroundColor: colors.surface, opacity: pressed ? 0.65 : 1 })}>
              <Text style={{ color: colors.text, fontSize: 21 }}>Set {i + 1}</Text>
              <Text style={{ color: colors.text, fontSize: 21 }}>{value === null ? "Log set" : `${value} ${unit} · Edit`}</Text>
            </Pressable>)}
          </View>
          {partner && item.supersetLogged ? <View style={{ gap: 10 }}>
            <Text style={{ color: colors.text, fontSize: 23 }}>{partner.exercise.name} · paired exercise</Text>
            <Text style={{ color: colors.text, fontSize: 19 }}>{partner.weight} kg · {partner.reps} {partner.exercise.timed ? "seconds" : "reps"} per set</Text>
            {item.supersetLogged.map((value, i) => <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${partner.exercise.name}, set ${i + 1}`} onPress={() => { setEditingPartner(true); setCount(String(value ?? partner.reps)); setEditing(i); }} style={{ minHeight: 64, paddingHorizontal: 18, borderRadius: 14, backgroundColor: colors.surface, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text style={{ color: colors.text, fontSize: 21 }}>Set {i + 1}</Text><Text style={{ color: colors.text, fontSize: 21 }}>{value === null ? "Log set" : `${value} · Edit`}</Text></Pressable>)}
          </View> : null}
        </> : <Text style={{ color: colors.text, fontSize: 20, lineHeight: 28 }}>You can move past this activity or finish the session below.</Text>}
      </View>
      <View style={{ gap: 10 }}>
        <BigButton label={active.cursor === active.items.length - 1 ? "Review workout" : "Next exercise"} disabled={isLift(item) && !done} onPress={() => setState((s) => goToCard(s, active.cursor + 1))} />
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Pressable accessibilityRole="button" disabled={active.cursor === 0} onPress={() => setState((s) => goToCard(s, active.cursor - 1))} style={{ minHeight: 48, justifyContent: "center", opacity: active.cursor === 0 ? 0.4 : 1 }}><Text style={{ color: colors.text, fontSize: 19 }}>Back</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => setActions(true)} style={{ minHeight: 48, justifyContent: "center" }}><Text style={{ color: colors.text, fontSize: 19 }}>Skip or finish</Text></Pressable>
        </View>
      </View>
      <Sheet visible={editing !== null} title={`Set ${(editing ?? 0) + 1}`} onClose={() => setEditing(null)}>
        <View style={{ paddingTop: 20, gap: 20 }}>
          <Text style={{ color: colors.text, fontSize: 23 }}>How many {editingUnit} did you complete?</Text>
          <TextInput accessibilityLabel={`Completed ${editingUnit}`} value={count} onChangeText={setCount} keyboardType="number-pad" selectTextOnFocus style={{ minHeight: 72, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 16, color: colors.text, fontSize: 36 }} />
          <BigButton label="Save set" disabled={!valid} onPress={() => { if (editing !== null) setState((s) => logCoreSet(s, editing, parsed, editingPartner ? "partner" : "main")); setEditing(null); }} />
        </View>
      </Sheet>
      <Sheet visible={actions} title="This workout" onClose={() => setActions(false)}>
        <View style={{ paddingTop: 16, gap: 14 }}>
          <BigButton label="Skip this exercise" quiet onPress={() => { setActions(false); setState((s) => goToCard(s, active.cursor + 1)); }} />
          <BigButton label="Review and finish now" quiet onPress={() => { setActions(false); setState((s) => goToCard(s, active.items.length)); }} />
        </View>
      </Sheet>
    </ScrollView>
  );
}

function Finish() {
  const { state, setState } = useSession();
  const insets = useSafeAreaInsets();
  const active = state.active;
  const hasWork = didTrain(active);
  const sets = active?.items.reduce((sum, item) => sum + item.logged.filter((value) => value !== null).length + (item.supersetLogged?.filter((value) => value !== null).length ?? 0), 0) ?? 0;
  return <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ flexGrow: 1, width: "100%", maxWidth: COLUMN, alignSelf: "center", paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 20) + 20 }}>
    <View style={{ flex: 1, justifyContent: "center", gap: 24, paddingVertical: 48 }}>
      <Text accessibilityRole="header" style={{ color: colors.text, fontFamily: fonts.display, fontSize: 48, lineHeight: 54 }}>{hasWork ? "Ready to finish?" : "Nothing logged yet."}</Text>
      {active ? <><Text style={{ color: colors.text, fontSize: 26 }}>{currentWorkout(state).name}</Text><Text style={{ color: colors.text, fontSize: 21 }}>{sets} {sets === 1 ? "set" : "sets"} logged. {hasWork ? "Only the work you logged will count." : "Leaving keeps this workout next."}</Text></> : <Text style={{ color: colors.text, fontSize: 21 }}>Your workout is saved.</Text>}
    </View>
    <View style={{ gap: 12 }}>
      <BigButton label={active ? hasWork ? "Finish & save" : "Leave workout" : "Back to Today"} onPress={() => { if (active) setState((s) => finishWorkout(s)); router.replace("/"); }} />
      {active?.items.length ? <BigButton label="Back to workout" quiet onPress={() => setState((s) => goToCard(s, Math.max(0, active.items.length - 1)))} /> : null}
    </View>
  </ScrollView>;
}
