import { useMemo, type ReactNode } from "react";

import { inLoop, loopInUse, loopOfWorkout, SessionContext, useSession, viewLoop } from "@/store/session";

/**
 * Everything inside works on one loop, whether or not it is the one in use:
 * it reads that loop as if it were in use, and every change goes to that
 * loop only (see `inLoop`). With no loop, or the loop in use, it changes
 * nothing — so a screen written for the loop in use works for any loop.
 */
export function LoopScope({ loop, children }: { loop?: string; children: ReactNode }) {
  const root = useSession();
  const value = useMemo(() => {
    if (!loop || loop === loopInUse(root.state)) return root;
    return {
      state: viewLoop(root.state, loop),
      setState: (action: Parameters<typeof root.setState>[0]) =>
        root.setState((s) => inLoop(s, loop, (view) => (typeof action === "function" ? action(view) : action))),
    };
  }, [root, loop]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** Inside, the loop a workout belongs to: for the editor's screens, whichever loop that is. */
export function WorkoutLoop({ id, children }: { id: string; children: ReactNode }) {
  const { state } = useSession();
  return <LoopScope loop={loopOfWorkout(state, id)}>{children}</LoopScope>;
}
