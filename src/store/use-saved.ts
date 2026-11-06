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

import { initialState, resetToDefault, type SessionState } from "@/store/session";
import {
  copyForTest,
  load,
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

  useEffect(() => {
    let live = true;
    (async () => {
      // Test mode left on stays on, so a restart mid-test is still a test.
      const profile = await loadProfile();
      const state = await load(profile);
      if (!live) return;
      setHeld({ state, profile });
      setReady(true);
    })();
    return () => {
      live = false;
    };
  }, []);

  // What screens see: plain state, whoever's it is.
  const setState = useCallback<Dispatch<SetStateAction<SessionState>>>(
    (next) =>
      setHeld((h) => ({ ...h, state: typeof next === "function" ? next(h.state) : next })),
    [],
  );

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
    const now = latest.current;
    await save(now.state, now.profile);
    let state: SessionState;
    if (profile === "real") state = await load("real");
    else if (from === "fresh") state = resetToDefault();
    else if (from === "copy") {
      state = copyForTest(now.profile === "real" ? now.state : await load("real"));
    } else state = await load("test");
    if (profile === "test") await save(state, "test");
    await saveProfile(profile);
    setHeld({ state, profile });
  }, []);

  return { state: held.state, setState, ready, profile: held.profile, switchTo };
};
