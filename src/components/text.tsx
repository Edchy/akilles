import { createContext, forwardRef, useContext } from "react";
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";

import { fonts } from "@/constants/theme";

/**
 * Every word in the app is EB Garamond. These stand in for React Native's
 * `Text` and `TextInput` so that an ordinary `fontWeight` or `fontStyle`
 * picks the matching Garamond file — custom faces ignore `fontWeight` on
 * iOS, and on the web a weight on top of a named file is a faked bold.
 *
 * Garamond sets small for its size (a short x-height), and the sizes across
 * the app were chosen for the system face, so a size given here is scaled up
 * to read the same. A style that names its own `fontFamily` is taken as
 * meant: drawn at exactly the size written, which is how the lift screen,
 * set straight from its comp, specifies everything.
 */
const SCALE = 1.12;

type Face = { weight: TextStyle["fontWeight"]; italic: boolean };

/** What a nested `Text` inherits when it says nothing about weight or slant. */
const Parent = createContext<Face | null>(null);

function familyFor({ weight, italic }: Face): string {
  const w = Number(weight === "bold" ? 700 : weight === "normal" || weight === undefined ? 400 : weight);
  // A step lighter than asked: the app's labels were set heavy for the
  // system face, and Garamond's bold weights are heavy for small text.
  if (w >= 900) return italic ? fonts.semiboldItalic : fonts.bold;
  if (w >= 700) return italic ? fonts.semiboldItalic : fonts.semibold;
  if (w >= 500) return italic ? fonts.mediumItalic : fonts.medium;
  return italic ? fonts.italic : fonts.regular;
}

function serif(style: TextProps["style"], parent: Face | null): { style: TextProps["style"]; face: Face | null } {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  // Garamond's own figures are old-style, rising and falling like lowercase:
  // lovely in a sentence, unsteady in a weight or a rep count. Every number
  // in the app is data, so figures stand at cap height unless asked.
  const variant = flat.fontVariant ?? [];
  const lining: TextStyle | null = variant.includes("oldstyle-nums") || variant.includes("lining-nums")
    ? null
    : { fontVariant: [...variant, "lining-nums"] };
  if (flat.fontFamily) return { style: lining ? [style, lining] : style, face: null };

  const said = flat.fontWeight !== undefined || flat.fontStyle !== undefined;
  const face: Face = {
    weight: flat.fontWeight ?? parent?.weight,
    italic: flat.fontStyle !== undefined ? flat.fontStyle === "italic" : (parent?.italic ?? false),
  };
  const extra: TextStyle = { ...lining };
  // Nested text that names nothing inherits its parent's face and size.
  if (said || !parent) {
    extra.fontFamily = familyFor(face);
    extra.fontWeight = "normal";
    extra.fontStyle = "normal";
  }
  if (typeof flat.fontSize === "number") extra.fontSize = Math.round(flat.fontSize * SCALE * 2) / 2;
  if (typeof flat.lineHeight === "number") extra.lineHeight = Math.round(flat.lineHeight * SCALE);
  return { style: [style, extra], face };
}

export const Text = forwardRef<NativeText, TextProps>(function Text({ style, children, ...rest }, ref) {
  const parent = useContext(Parent);
  const { style: next, face } = serif(style, parent);
  return (
    <NativeText ref={ref} style={next} {...rest}>
      {face ? <Parent.Provider value={face}>{children}</Parent.Provider> : children}
    </NativeText>
  );
});

export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function TextInput(
  { style, ...rest },
  ref,
) {
  return <NativeTextInput ref={ref} style={serif(style, null).style} {...rest} />;
});
