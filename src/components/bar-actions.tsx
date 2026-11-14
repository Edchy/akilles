import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Lets a screen put its own buttons in the persistent bottom bar.
 *
 * The bar itself lives in the root layout and never unmounts; a screen calls
 * `useBarActions` to swap what it contains. Without this the workout screen
 * would render its own bar, and mounting one while the tab bar unmounted is
 * what made the content above appear to jump.
 */
type Value = {
  actions: ReactNode | null;
  setActions: (node: ReactNode | null) => void;
  /** A screen that needs the whole display — a workout's cards — puts the bar away. */
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
};

const BarActionsContext = createContext<Value | null>(null);

export function BarActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode | null>(null);
  const [hidden, setHidden] = useState(false);
  return (
    <BarActionsContext.Provider value={{ actions, setActions, hidden, setHidden }}>
      {children}
    </BarActionsContext.Provider>
  );
}

export const useBarSlot = (): ReactNode | null =>
  useContext(BarActionsContext)?.actions ?? null;

/** Publish this screen's bar buttons. Cleared when the screen unmounts. */
export function useBarActions(node: ReactNode, deps: unknown[]) {
  const ctx = useContext(BarActionsContext);
  useEffect(() => {
    ctx?.setActions(node);
    return () => ctx?.setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Whether a screen has put the bar away. */
export const useBarHidden = (): boolean => useContext(BarActionsContext)?.hidden ?? false;

/** Put the bar away for as long as this screen is up. */
export function useHideBar() {
  const ctx = useContext(BarActionsContext);
  const setHidden = ctx?.setHidden;
  useEffect(() => {
    setHidden?.(true);
    return () => setHidden?.(false);
  }, [setHidden]);
}
