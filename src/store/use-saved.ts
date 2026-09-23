/**
 * The session state, backed by the device.
 *
 * Reads once on launch and writes after every change. Until the read
 * finishes `ready` is false and nothing is written, so an empty starting
 * state cannot overwrite a year of training in the moment before it loads.
 */

import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { load, save } from "@/store/storage";
import { initialState, type SessionState } from "@/store/session";

/** Wait this long after a change before writing, so a held +/- writes once. */
const DEBOUNCE_MS = 400;

export const useSaved = () => {
  const [state, setState] = useState<SessionState>(initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    load().then((saved) => {
      if (!live) return;
      setState(saved);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, []);

  // Hold the latest state in a ref so the unmount write below sees it without
  // making the cleanup re-run on every change.
  const latest = useRef(state);
  latest.current = state;

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => save(state), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state, ready]);

  // A pending debounce would otherwise be dropped when the app goes away.
  // Backgrounding is the moment the OS may kill us, so flush there too rather
  // than relying on unmount, which a killed app never runs.
  useEffect(() => {
    if (!ready) return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") save(latest.current);
    });
    return () => {
      sub.remove();
      save(latest.current);
    };
  }, [ready]);

  return { state, setState, ready };
};
