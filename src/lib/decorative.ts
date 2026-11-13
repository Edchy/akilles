import { Platform } from "react-native";

/**
 * Props for a drawn shape that says nothing a screen reader should read: the
 * words beside it do. For an `Svg`, which on the web hands its props straight
 * to the page — where the phone's own prop is not a known attribute.
 */
export const DECORATIVE =
  Platform.OS === "web"
    ? ({ "aria-hidden": true } as const)
    : ({ accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" } as const);
