import { createContext, useContext } from "react";

/**
 * Whether what is drawn sits on a card of the workout's row (see `Deck` in
 * `app/workout.tsx`): the card brings its own edges, so what is on it leaves
 * no room for the status bar above or the floating bar below, and draws no
 * session header of its own.
 */
export const CardContext = createContext(false);

export const useOnCard = (): boolean => useContext(CardContext);

/** Full card content stays mounted; only the current card animates. */
export const CardActiveContext = createContext(true);
export const useCardActive = () => useContext(CardActiveContext);
