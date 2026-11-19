import { useState } from "react";
import { View } from "react-native";

import { KitChooser, kitName } from "@/components/place";
import { BigButton, OpenRow, Sheet, TextButton } from "@/components/sheet";
import { Text, TextInput } from "@/components/text";
import { colors, fonts } from "@/constants/theme";
import type { Kit } from "@/data/kit";
import { PLAN_ABOUT, PLAN_IDS, PLAN_NAME, type PlanId } from "@/data/plans";
import { newId } from "@/data/split";
import {
  deleteLoop,
  kitOfLoop,
  loopsOf,
  newLoop,
  renameLoop,
  setLoopKit,
  switchLoop,
  useSession,
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
  | { at: "kit"; id: string; fresh?: boolean };

const isBuiltIn = (id: string): id is PlanId => (PLAN_IDS as string[]).includes(id);

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
  const [deleting, setDeleting] = useState(false);
  const plans = loopsOf(state);
  const training = !!state.active;
  const go = (next: Step) => {
    setDeleting(false);
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
            Where will you train with this plan? Klay fits each workout in it to what is there.
          </Text>
          <KitChooser kit={kit} onChange={setKit} />
          <BigButton label={step.fresh ? "Next" : "Save"} disabled={inUse && training} onPress={save} />
          {step.fresh ? null : <TextButton label="Cancel" onPress={() => go({ at: "plan", id: step.id })} />}
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
                setState((s) => switchLoop(s, plan.id));
                close();
              }}
            />
          )}
          <OpenRow
            title="Where you train it"
            detail={kitName(kitOfLoop(state, plan.id))}
            onPress={() => {
              setKit(kitOfLoop(state, plan.id));
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

    return (
      <View style={{ gap: 12, paddingTop: 8 }}>
        {training ? <InProgress what="switch plan" /> : null}
        {plans.map((p) => (
          <OpenRow
            key={p.id}
            title={p.name}
            detail={`${isBuiltIn(p.id) && p.name === PLAN_NAME[p.id] ? PLAN_ABOUT[p.id] : `${countLine(p.workouts.length)}.`} ${kitName(kitOfLoop(state, p.id))}.`}
            tag={p.inUse ? "In use" : undefined}
            onPress={() => go({ at: "plan", id: p.id })}
          />
        ))}
        <OpenRow
          title="Add a plan"
          detail="An empty plan, for another place or another way to train"
          onPress={() => {
            setName("");
            go({ at: "add" });
          }}
        />
      </View>
    );
  })();

  return (
    <Sheet visible={visible} title="Your plans" closeLabel="Done" onClose={close}>
      {body}
    </Sheet>
  );
}
