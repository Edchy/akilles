import { router } from "expo-router";
import { useNavigation } from "expo-router/react-navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { mergeDraft, SessionContext, useSession, type SessionState } from "@/store/session";

/**
 * The workout editor works on a copy, saved as it closes — however it closes.
 * No question on the way out: every change in it was one you chose to make.
 * The copy keeps the editor's screens from writing to your plan while you
 * are in the middle of things, and `mergeDraft` keeps anything changed
 * elsewhere meanwhile.
 *
 * Everything inside — the workout, its exercises, swapping one — reads and
 * writes the copy through the ordinary `useSession`, so those screens don't
 * know or care.
 */
type Draft = {
  /** Something differs from how the editor opened. */
  dirty: boolean;
  /** A workout made in this draft, not yet in the plan. */
  isNew: boolean;
  /** Save the copy and close. */
  done: () => void;
};

const DraftContext = createContext<Draft | null>(null);

/** The editor's draft, inside a `DraftScope`. */
export const useDraft = (): Draft | null => useContext(DraftContext);

export function DraftScope({
  make,
  children,
}: {
  /** For a new workout: how to make it, in the copy. */
  make?: (state: SessionState) => SessionState;
  children: ReactNode;
}) {
  const root = useSession();
  const navigation = useNavigation();
  // Read once, when the editor opens.
  const [opened] = useState(() => {
    const base = root.state;
    return { base, first: make ? make(base) : base };
  });
  const [draft, setDraft] = useState(opened.first);
  const [leaving, setLeaving] = useState(false);
  // A new workout is a change in itself: picked, then Done, it is added.
  const dirty = !!make || draft !== opened.first;

  const save = useCallback(
    () => root.setState((current) => mergeDraft(opened.base, current, draft)),
    [root, opened, draft],
  );

  // Done: save, then close.
  useEffect(() => {
    if (leaving) router.back();
  }, [leaving]);

  // Closed any other way: saved all the same.
  const unsaved = useRef({ dirty, leaving, save });
  unsaved.current = { dirty, leaving, save };
  useEffect(
    () =>
      navigation.addListener("beforeRemove", () => {
        const { dirty, leaving, save } = unsaved.current;
        if (dirty && !leaving) save();
      }),
    [navigation],
  );

  const session = useMemo(() => ({ state: draft, setState: setDraft }), [draft]);
  const value = useMemo<Draft>(
    () => ({
      dirty,
      isNew: !!make,
      done: () => {
        if (dirty) save();
        setLeaving(true);
      },
    }),
    [dirty, save, make],
  );

  return (
    <DraftContext.Provider value={value}>
      <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
    </DraftContext.Provider>
  );
}
