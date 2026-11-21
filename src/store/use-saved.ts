/**
 * The session state, backed by the device.
 *
 * Reads once on launch and writes after every change. Until the read
 * finishes `ready` is false and nothing is written, so an empty starting
 * state cannot overwrite a year of training in the moment before it loads.
 *
 * The training is held together with whose it is — your real training or
 * test mode's — and the two only ever change together, so a write always
 * lands in its own save and test mode can never write over the real one.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { AppState } from "react-native";

import { correctTreadmillTarget, followPlan, initialState, resetToDefault, type SessionState } from "@/store/session";
import {
  copyForTest,
  FROM_MAC,
  isLocked,
  load,
  unlock,
  loadProfile,
  save,
  saveProfile,
  type Profile,
} from "@/store/storage";
import type { TestStart } from "@/store/test-mode";

/** Wait this long after a change before writing, so a held +/- writes once. */
const DEBOUNCE_MS = 400;

type Held = { state: SessionState; profile: Profile };

export const useSaved = () => {
  const [held, setHeld] = useState<Held>({ state: initialState, profile: "real" });
  const [ready, setReady] = useState(false);
  // The save on screen is from a newer version: shown as such, never written.
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      // Test mode left on stays on, so a restart mid-test is still a test.
      const profile = await loadProfile();
      const state = await load(profile);
      if (!live) return;
      setHeld({ state, profile });
      setLocked(isLocked(profile));
      setReady(true);
    })();
    return () => {
      live = false;
    };
  }, []);

  // What screens see: plain state, whoever's it is.
  const setState = useCallback<Dispatch<SetStateAction<SessionState>>>(
    (next) =>
      setHeld((h) => {
        const after = typeof next === "function" ? next(h.state) : next;
        // A plan edit mid-workout reaches the workout too: see `followPlan`.
        return { ...h, state: followPlan(h.state, after) };
      }),
    [],
  );

  // Fast refresh preserves the old in-memory state, so disk migration alone
  // would leave the current treadmill card showing its previous time target.
  useEffect(() => {
    if (!ready) return;
    setHeld((current) => {
      const state = correctTreadmillTarget(current.state);
      return state === current.state ? current : { ...current, state };
    });
  }, [ready]);

  // Hold the latest in a ref so the unmount write below sees it without
  // making the cleanup re-run on every change.
  const latest = useRef(held);
  latest.current = held;

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => save(held.state, held.profile), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [held, ready]);

  // A pending debounce would otherwise be dropped when the app goes away.
  // Backgrounding is the moment the OS may kill us, so flush there too rather
  // than relying on unmount, which a killed app never runs.
  useEffect(() => {
    if (!ready) return;
    const flush = () => save(latest.current.state, latest.current.profile);
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") flush();
    });
    return () => {
      sub.remove();
      flush();
    };
  }, [ready]);

  /**
   * Swap whose training is on screen. What is there now is written to its
   * own save first — the pending write is dropped once the state changes
   * under it — and only then is the other read in.
   */
  const switchTo = useCallback(async (profile: Profile, from: TestStart = "resume") => {
    // From the Mac there is no way out of test mode: see `FROM_MAC`.
    if (profile === "real" && FROM_MAC) return;
    const now = latest.current;
    await save(now.state, now.profile);
    let state: SessionState;
    if (profile === "real") state = await load("real");
    else if (from === "fresh") state = resetToDefault();
    else if (from === "copy") {
      state = copyForTest(now.profile === "real" ? now.state : await load("real"));
    } else state = await load("test");
    // A new test, chosen on purpose, may replace one from a newer version.
    if (profile === "test" && from !== "resume") unlock("test");
    if (profile === "test") await save(state, "test");
    await saveProfile(profile);
    setHeld({ state, profile });
    setLocked(isLocked(profile));
  }, []);

  return { state: held.state, setState, ready, locked, profile: held.profile, switchTo };
};
