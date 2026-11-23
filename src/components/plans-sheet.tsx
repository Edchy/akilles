import { useState } from "react";
import { Pressable, View } from "react-native";

import { KitChooser, kitName, WeightChips } from "@/components/place";
import { Icon } from "@/components/icon";
import { BigButton, OpenRow, SectionLabel, Sheet, TextButton } from "@/components/sheet";
import { Swipe, swipedRecently } from "@/components/swipe";
import { Text, TextInput } from "@/components/text";
import { CLAY_LOOK, colors, fonts, radii } from "@/constants/theme";
import { byId } from "@/data/exercises";
import type { Kit } from "@/data/kit";
import { PLAN_ABOUT, PLAN_IDS, PLAN_NAME, type PlanId } from "@/data/plans";
import { newId } from "@/data/split";
import {
  canRestore,
  deleteLoop,
  equipmentChanges,
  kitOfLoop,
  loopsOf,
  newLoop,
  renameLoop,
  restoreChanges,
  restoreLoop,
  setLoopKit,
  switchLoop,
  useSession,
  type SessionState,
} from "@/store/session";

/**
 * What the sheet shows: the list, one plan, naming a new one, renaming one,
 * or what one is trained with.
 */
type Step =
  | { at: "list" }
  | { at: "plan"; id: string }
  | { at: "add" }
  | { at: "rename"; id: string }
  | { at: "kit"; id: string; fresh?: boolean }
  | { at: "restore"; id: string }
  /** Kettlebell Flow's equipment: only which bells. `use` switches to it after. */
  | { at: "bells"; id: string; use?: boolean };

const isBuiltIn = (id: string): id is PlanId => (PLAN_IDS as string[]).includes(id);

/** Kettlebell Flow is kettlebells by definition: it asks only which ones, never gym or bodyweight. */
const BELLS_ONLY = "kettlebell_flow";

/** Kettlebell Flow's kit: kettlebells, which ones, and which you have two of. */
const bellKit = (bells: number[], pairs: number[]): Kit => ({
  gear: ["kettlebell"],
  ...(bells.length ? { weights: { kettlebell: bells }, pairs } : {}),
});

/** What a plan is trained with, in a few words — Kettlebell Flow before it is told says so. */
const equipmentLine = (kit: Kit | undefined, id: string) =>
  id === BELLS_ONLY && !kit ? "Kettlebells, which ones not set yet" : kitName(kit);

/** "Three workouts", "One workout", "No workouts yet". */
const countLine = (n: number) =>
  n === 0 ? "No workouts yet" : `${n === 1 ? "One" : n} workout${n === 1 ? "" : "s"}`;

/**
 * Said first, plainly, whenever a workout is running: it is why switching
 * plan, or changing what the plan in use has, has to wait.
 */
function InProgress({ what }: { what: string }) {
  return (
    <View style={{ gap: 6, padding: 16, borderRadius: 16, borderCurve: "continuous", backgroundColor: colors.surface }}>
      <Text style={{ color: colors.text, fontSize: 18, lineHeight: 25, fontWeight: "600" }}>
        You have a workout in progress.
      </Text>
      <Text style={{ color: colors.text, fontSize: 17, lineHeight: 24 }}>
        {`Finish it or end it on Today first, then you can ${what}.`}
      </Text>
    </View>
  );
}

/**
 * What the equipment on screen would change in the plan's workouts, before
 * it is saved, so nothing is swapped without your seeing it: each workout,
 * then each exercise that gives way and what takes its place.
 */
function Changes({ planId, kit }: { planId: string; kit: Kit | undefined }) {
  const { state } = useSession();
  const changes = equipmentChanges(state, planId, kit);
  if (changes.length === 0) return null;
  const workouts = [...new Set(changes.map((c) => c.workout))];
  const name = (id: string) => byId(id)?.name ?? id;
  return (
    <View style={{ gap: 12, padding: 16, borderRadius: 16, borderCurve: "continuous", backgroundColor: colors.surface }}>
      <SectionLabel>What changes in your workouts</SectionLabel>
      {workouts.map((w) => (
        <View key={w} style={{ gap: 4 }}>
          <Text style={{ color: colors.text, fontFamily: fonts.display, fontSize: 22 }}>{w}</Text>
          {changes
            .filter((c) => c.workout === w)
            .map((c) => (
              <View key={c.from}>
                <Text style={{ color: colors.text, fontSize: 17, lineHeight: 24 }}>
                  {`${name(c.from)} → ${c.to ? name(c.to) : "left out"}`}
                </Text>
                {c.why ? <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 21 }}>{c.why}</Text> : null}
              </View>
            ))}
        </View>
      ))}
    </View>
  );
}

/**
 * One plan in the list. The one you are on is ink, with "In use" and a tick,
 * so it is found at a glance; the others are cream clay.
 */
function PlanCard({ name, detail, inUse, onPress }: { name: string; detail: string; inUse?: boolean; onPress: () => void }) {
  const ink = inUse ? colors.ink : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}${inUse ? ", the plan you are on" : ""}. ${detail}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 96,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderRadius: radii.card,
        borderCurve: "continuous",
        backgroundColor: inUse ? colors.text : CLAY_LOOK.well,
        boxShadow: pressed ? CLAY_LOOK.dent : inUse ? CLAY_LOOK.puff : CLAY_LOOK.bump,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 4 }}>
        {inUse ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon name="check" size={14} color={ink} />
            <Text ui style={{ color: ink, fontSize: 14, fontWeight: "700" }}>In use</Text>
          </View>
        ) : null}
        <Text style={{ color: ink, fontFamily: fonts.display, fontSize: 30, lineHeight: 34 }}>{name}</Text>
        <Text ui style={{ color: ink, opacity: inUse ? 0.85 : 1, fontSize: 15, lineHeight: 21 }}>{detail}</Text>
      </View>
      <Icon name="open" size={15} color={ink} />
    </Pressable>
  );
}

/**
 * Your plans, in Settings: which one you are on, and the others waiting.
 * Pick one to use it, say what it is trained with, rename it or delete it;
 * add a new one, empty, to fill on Plan. Kept here, out of Plan, so the
 * screen you train from stays clear.
 */
export function PlansSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state, setState } = useSession();
  const [step, setStep] = useState<Step>({ at: "list" });
  const [name, setName] = useState("");
  const [kit, setKit] = useState<Kit | undefined>(undefined);
  const [bells, setBells] = useState<number[]>([]);
  const [pairs, setPairs] = useState<number[]>([]);
  const [deleting, setDeleting] = useState(false);
  // A plan swiped away, held so it can be put back with Undo.
  const [undo, setUndo] = useState<{ name: string; before: SessionState } | null>(null);
  const plans = loopsOf(state);
  const training = !!state.active;
  const go = (next: Step) => {
    setDeleting(false);
    setUndo(null);
    setStep(next);
  };
  const close = () => {
    go({ at: "list" });
    onClose();
  };

  const body = (() => {
    if (step.at === "add" || step.at === "rename") {
      const renaming = step.at === "rename";
      const save = () => {
        if (!name.trim()) return;
        if (renaming) {
          setState((s) => renameLoop(s, step.id, name));
          go({ at: "plan", id: step.id });
        } else {
          const id = newId("plan");
          setState((s) => newLoop(s, id, name));
          setKit(undefined);
          go({ at: "kit", id, fresh: true });
        }
      };
      return (
        <View style={{ gap: 20, paddingTop: 8 }}>
          <Text style={{ color: colors.text, fontSize: 19, lineHeight: 27 }}>
            {renaming ? "A new name for this plan." : "Name your plan: where you will use it, or what it is for. Gym, Home, Travel."}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            autoFocus
            placeholder={renaming ? "" : "Travel"}
            placeholderTextColor={colors.dim}
            accessibilityLabel="Plan name"
            selectionColor={colors.text}
            returnKeyType="done"
            onSubmitEditing={save}
            style={{
              minHeight: 52,
              paddingHorizontal: 16,
              borderRadius: 16,
              backgroundColor: colors.surface,
              color: colors.text,
              fontSize: 20,
            }}
          />
          <BigButton label={renaming ? "Save" : "Next"} disabled={!name.trim()} onPress={save} />
          <TextButton label="Cancel" onPress={() => go(renaming ? { at: "plan", id: step.id } : { at: "list" })} />
        </View>
      );
    }

    if (step.at === "kit") {
      const inUse = plans.find((p) => p.id === step.id)?.inUse;
      const save = () => {
        setState((s) => setLoopKit(s, step.id, kit));
        go({ at: "plan", id: step.id });
      };
      return (
        <View style={{ gap: 20, paddingTop: 8 }}>
          {inUse && training ? <InProgress what="change what this plan has" /> : null}
          <Text style={{ color: colors.text, fontSize: 19, lineHeight: 27 }}>
            What will you train with? Klay picks exercises you can do with it, and the Library shows only those.
          </Text>
          <KitChooser kit={kit} onChange={setKit} />
          <Changes planId={step.id} kit={kit} />
          <BigButton label={step.fresh ? "Next" : "Save"} disabled={inUse && training} onPress={save} />
          {step.fresh ? null : <TextButton label="Cancel" onPress={() => go({ at: "plan", id: step.id })} />}
        </View>
      );
    }

    // Kettlebell Flow is built round your own bells: which ones decides every
    // weight it gives you and every step up, so it asks before it starts.
    if (step.at === "bells") {
      const plan = plans.find((p) => p.id === step.id);
      if (!plan) return null;
      // Changing the bells of the plan in use waits for the workout to end, as any equipment does.
      const blocked = training && (step.use || plan.inUse);
      return (
        <View style={{ gap: 20, paddingTop: 8 }}>
          {blocked ? <InProgress what={step.use ? "switch plan" : "change what this plan has"} /> : null}
          <Text style={{ color: colors.text, fontSize: 22, lineHeight: 29, fontWeight: "700" }}>
            Which kettlebells do you have?
          </Text>
          <Text style={{ color: colors.text, fontSize: 18, lineHeight: 26 }}>
            Tap each one. Klay only gives you weights you own, and adds reps before each step up to a heavier one.
          </Text>
          <WeightChips
            load="kettlebell"
            chosen={bells}
            onChange={(list) => {
              setBells(list);
              setPairs((p) => p.filter((w) => list.includes(w)));
            }}
            pairs={pairs}
            onPairs={setPairs}
            bare
          />
          <Changes planId={plan.id} kit={bellKit(bells, pairs)} />
          <BigButton
            label={step.use ? "Use this plan" : "Save"}
            disabled={blocked}
            onPress={() => {
              const kit = bellKit(bells, pairs);
              if (step.use) {
                setState((s) => switchLoop(setLoopKit(s, plan.id, kit), plan.id));
                close();
              } else {
                setState((s) => setLoopKit(s, plan.id, kit));
                go({ at: "plan", id: plan.id });
              }
            }}
          />
          <TextButton label="Back" onPress={() => go({ at: "plan", id: plan.id })} />
        </View>
      );
    }

    if (step.at === "restore") {
      const plan = plans.find((p) => p.id === step.id);
      if (!plan) return null;
      const blocked = plan.inUse && training;
      const changes = restoreChanges(state, plan.id);
      return (
        <View style={{ gap: 20, paddingTop: 8 }}>
          {blocked ? <InProgress what="restore this plan" /> : null}
          <Text style={{ color: colors.text, fontSize: 22, lineHeight: 29, fontWeight: "700" }}>
            Restore {PLAN_NAME[plan.id as PlanId]} to how Klay made it?
          </Text>
          <Text style={{ color: colors.text, fontSize: 18, lineHeight: 26 }}>
            Your changes to its workouts go. Your weights, your history and its equipment stay
            {plan.id === "ppl" ? ", and so does everything it has grown" : ""}.
          </Text>
          {changes.length > 0 ? (
            <View style={{ gap: 12, padding: 16, borderRadius: 16, borderCurve: "continuous", backgroundColor: colors.surface }}>
              <SectionLabel>What changes</SectionLabel>
              {changes.map((c, i) => (
                <View key={i} style={{ gap: 2 }}>
                  <Text style={{ color: colors.text, fontFamily: fonts.display, fontSize: 22 }}>{c.workout}</Text>
                  <Text style={{ color: colors.text, fontSize: 17, lineHeight: 24 }}>{c.what}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <BigButton
            label="Restore plan"
            disabled={blocked}
            onPress={() => {
              setState((s) => restoreLoop(s, plan.id));
              go({ at: "plan", id: plan.id });
            }}
          />
          <TextButton label="Cancel" onPress={() => go({ at: "plan", id: plan.id })} />
        </View>
      );
    }

    if (step.at === "plan") {
      const plan = plans.find((p) => p.id === step.id);
      if (!plan) return null;
      return (
        <View style={{ gap: 20, paddingTop: 8 }}>
          {!plan.inUse && training ? <InProgress what="switch plan" /> : null}
          <Text style={{ color: colors.text, fontFamily: fonts.display, fontSize: 28 }}>{plan.name}</Text>
          <Text style={{ color: colors.text, fontSize: 19, lineHeight: 27 }}>
            {plan.inUse
              ? "The plan you are on. Its workouts are the ones on Today and Plan."
              : plan.workouts.length === 0
                ? "Nothing in it yet. Use it, then add its workouts on Plan."
                : "Use it and its workouts take over on Today and Plan, where it left off. The plan you are on waits exactly as it is. Your weights and history stay the same in every plan."}
          </Text>
          {plan.inUse ? null : (
            <BigButton
              label="Use this plan"
              disabled={training}
              onPress={() => {
                // Kettlebell Flow still set to a full gym has not been told your bells.
                if (plan.id === BELLS_ONLY && !kitOfLoop(state, plan.id)) {
                  setBells([]);
                  setPairs([]);
                  go({ at: "bells", id: plan.id, use: true });
                  return;
                }
                setState((s) => switchLoop(s, plan.id));
                close();
              }}
            />
          )}
          <OpenRow
            title="Equipment"
            detail={equipmentLine(kitOfLoop(state, plan.id), plan.id)}
            onPress={() => {
              const kit = kitOfLoop(state, plan.id);
              if (plan.id === BELLS_ONLY) {
                setBells(kit?.weights?.kettlebell ?? []);
                setPairs(kit?.pairs ?? []);
                go({ at: "bells", id: plan.id });
                return;
              }
              setKit(kit);
              go({ at: "kit", id: plan.id });
            }}
          />
          <OpenRow
            title="Rename"
            onPress={() => {
              setName(plan.name);
              go({ at: "rename", id: plan.id });
            }}
          />
          {canRestore(state, plan.id) ? (
            <OpenRow
              title="Restore to original"
              detail="Undo your changes to its workouts. Your weights stay."
              onPress={() => go({ at: "restore", id: plan.id })}
            />
          ) : null}
          {plan.inUse ? null : deleting ? (
            <View style={{ gap: 12 }}>
              <Text style={{ color: colors.bend, fontSize: 17, lineHeight: 24, fontWeight: "600" }}>
                {plan.workouts.length === 0
                  ? "Delete this plan?"
                  : "Delete this plan and its workouts? What you lifted in them stays in your history."}
              </Text>
              <BigButton
                label="Delete plan"
                danger
                onPress={() => {
                  setState((s) => deleteLoop(s, plan.id));
                  go({ at: "list" });
                }}
              />
              <TextButton label="Keep it" onPress={() => setDeleting(false)} />
            </View>
          ) : (
            <BigButton label="Delete plan" quiet onPress={() => setDeleting(true)} />
          )}
          <TextButton label="Back" onPress={() => go({ at: "list" })} />
        </View>
      );
    }

    const current = plans.find((p) => p.inUse);
    const others = plans.filter((p) => !p.inUse);
    const about = (p: (typeof plans)[number]) =>
      `${isBuiltIn(p.id) && p.name === PLAN_NAME[p.id] ? PLAN_ABOUT[p.id] : `${countLine(p.workouts.length)}.`} ${equipmentLine(kitOfLoop(state, p.id), p.id)}.`;
    return (
      <View style={{ gap: 12, paddingTop: 8 }}>
        {training ? <InProgress what="switch plan" /> : null}
        {current ? (
          <>
            <SectionLabel>The plan you are on</SectionLabel>
            <PlanCard name={current.name} detail={about(current)} inUse onPress={() => go({ at: "plan", id: current.id })} />
          </>
        ) : null}
        {others.length > 0 ? (
          <>
            <View style={{ height: 12 }} />
            <SectionLabel>Your other plans</SectionLabel>
            {others.map((p) => (
              <Swipe
                key={p.id}
                radius={radii.card}
                actions={[
                  {
                    label: "Delete",
                    destructive: true,
                    onPress: () => {
                      const before = state;
                      setState((s) => deleteLoop(s, p.id));
                      setUndo({ name: p.name, before });
                    },
                  },
                ]}
              >
                {/* A swipe that ends on the card is not a tap on it. */}
                <PlanCard name={p.name} detail={about(p)} onPress={() => { if (!swipedRecently()) go({ at: "plan", id: p.id }); }} />
              </Swipe>
            ))}
          </>
        ) : null}
        {undo ? (
          <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 }}>
            <Text style={{ flex: 1, color: colors.text, fontSize: 17, lineHeight: 24 }}>{`${undo.name} deleted.`}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Undo deleting ${undo.name}`}
              hitSlop={8}
              onPress={() => {
                const back = undo.before;
                setState(() => back);
                setUndo(null);
              }}
              style={({ pressed }) => ({ minHeight: 44, justifyContent: "center", opacity: pressed ? 0.6 : 1 })}
            >
              <Text ui style={{ color: colors.text, fontSize: 17, fontWeight: "700" }}>Undo</Text>
            </Pressable>
          </View>
        ) : others.length > 0 ? (
          <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 21 }}>Swipe a plan to the left to delete it.</Text>
        ) : null}
        <View style={{ height: 8 }} />
        {/* Not a plan: an outline with a +, so it never reads as one. */}
        <Pressable
          accessibilityRole="button"
          accessibilityHint="An empty plan, for another place or another way to train"
          onPress={() => {
            setName("");
            go({ at: "add" });
          }}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            minHeight: 64,
            borderRadius: radii.card,
            borderCurve: "continuous",
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: colors.muted,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Icon name="plus" size={18} color={colors.text} />
          <Text ui style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>Add a plan</Text>
        </Pressable>
      </View>
    );
  })();

  return (
    <Sheet visible={visible} title="Your plans" closeLabel="Done" onClose={close}>
      {body}
    </Sheet>
  );
}
