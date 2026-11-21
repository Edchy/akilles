import { createContext, forwardRef, useContext, type ReactNode } from "react";
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";

import { fonts, headlineOf, worn } from "@/constants/theme";
import { noOrphan } from "@/lib/typography";

/**
 * Every word in the app is EB Garamond, but for the interface — see `ui`
 * below, and `fonts.ui`. These stand in for React Native's
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

type Face = { weight: TextStyle["fontWeight"]; italic: boolean; ui: boolean };

/**
 * How much larger than written a size is drawn: Garamond's lift, unless the
 * style names its own face (drawn as written) or it's the interface face.
 */
export function drawnScale(style: TextProps["style"], ui?: boolean): number {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  return flat.fontFamily || ui ? 1 : worn.fontScale;
}

/** What a nested `Text` inherits when it says nothing about weight or slant. */
const Parent = createContext<Face | null>(null);

function familyFor({ weight, italic, ui }: Face): string {
  const w = Number(weight === "bold" ? 700 : weight === "normal" || weight === undefined ? 400 : weight);
  // The interface face, weight for weight; its italic only comes regular.
  if (ui) {
    if (italic) return fonts.uiItalic;
    if (w >= 700) return fonts.uiBold;
    if (w >= 600) return fonts.uiSemibold;
    if (w >= 500) return fonts.uiMedium;
    return fonts.ui;
  }
  // A step lighter than asked: the app's labels were set heavy for the
  // system face, and Garamond's bold weights are heavy for small text.
  if (w >= 900) return italic ? fonts.semiboldItalic : fonts.bold;
  if (w >= 700) return italic ? fonts.semiboldItalic : fonts.semibold;
  if (w >= 500) return italic ? fonts.mediumItalic : fonts.medium;
  return italic ? fonts.italic : fonts.regular;
}

function serif(
  style: TextProps["style"],
  parent: Face | null,
  ui?: boolean,
): { style: TextProps["style"]; face: Face | null } {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  // Garamond's own figures are old-style, rising and falling like lowercase:
  // lovely in a sentence, unsteady in a weight or a rep count. Every number
  // in the app is data, so figures stand at cap height unless asked.
  const variant = flat.fontVariant ?? [];
  const lining: TextStyle | null = variant.includes("oldstyle-nums") || variant.includes("lining-nums")
    ? null
    : { fontVariant: [...variant, "lining-nums"] };
  if (flat.fontFamily) {
    const tall = worn.poster && flat.fontFamily === fonts.display ? headlineSize(flat) : null;
    return { style: lining || tall ? [style, lining, tall] : style, face: null };
  }

  const said = flat.fontWeight !== undefined || flat.fontStyle !== undefined;
  const face: Face = {
    weight: flat.fontWeight ?? parent?.weight,
    italic: flat.fontStyle !== undefined ? flat.fontStyle === "italic" : (parent?.italic ?? false),
    ui: ui ?? parent?.ui ?? false,
  };
  const extra: TextStyle = { ...lining };
  // Nested text that names nothing inherits its parent's face and size.
  if (said || !parent || face.ui !== parent.ui) {
    extra.fontFamily = familyFor(face);
    extra.fontWeight = "normal";
    extra.fontStyle = "normal";
  }
  // Atkinson reads full size as written; only Garamond needs the lift.
  const scale = face.ui ? 1 : worn.fontScale;
  if (typeof flat.fontSize === "number") extra.fontSize = Math.round(flat.fontSize * scale * 2) / 2;
  if (typeof flat.lineHeight === "number") extra.lineHeight = Math.round(flat.lineHeight * scale);
  return { style: [style, extra], face };
}

/**
 * A Poster headline, sized for its face (see `HEADLINES`): scaled so its
 * capitals stand as tall as Anton's would. And a tall face given a line
 * shorter than its own is cut off at the top on iOS, which keeps the foot of
 * the letters — so it gets its whole line, and the margins give back the
 * difference, half above and half below, so it takes the room written.
 */
function headlineSize(flat: TextStyle): TextStyle | null {
  if (typeof flat.fontSize !== "number") return null;
  const face = headlineOf(worn.headline);
  const size = Math.round(flat.fontSize * face.scale);
  if (typeof flat.lineHeight !== "number") return face.scale === 1 ? null : { fontSize: size };
  const written = Math.round(flat.lineHeight * face.scale);
  const whole = Math.ceil(size * face.height);
  if (written >= whole) return { fontSize: size, lineHeight: written };
  const back = (whole - written) / 2;
  const at = (side: TextStyle["marginTop"]) => (typeof side === "number" ? side : 0) - back;
  return {
    fontSize: size,
    lineHeight: whole,
    marginTop: at(flat.marginTop ?? flat.marginVertical ?? flat.margin),
    marginBottom: at(flat.marginBottom ?? flat.marginVertical ?? flat.margin),
  };
}

/** Every plain string in a run of text, in capitals. */
function upper(children: ReactNode): ReactNode {
  if (typeof children === "string") return children.toUpperCase();
  if (Array.isArray(children)) return children.map((c) => (typeof c === "string" ? c.toUpperCase() : c));
  return children;
}

/**
 * No word left alone on a paragraph's last line — see `noOrphan`. Applied to
 * the text the paragraph ends on: a plain string, or the last thing said in
 * a mix like "<italic>Own it:</italic> pause at the bottom…".
 */
function settle(children: ReactNode): ReactNode {
  if (typeof children === "string") return noOrphan(children);
  if (!Array.isArray(children)) return children;
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    if (child === null || child === undefined || typeof child === "boolean" || child === "") continue;
    if (typeof child !== "string") return children;
    const tied = noOrphan(child);
    return tied === child ? children : children.map((c, j) => (j === i ? tied : c));
  }
  return children;
}

/**
 * `ui` draws it in the interface face — a button, a tab, a chip, a small
 * label — instead of Garamond. Nested text inherits it. `name` is a name, not
 * a sentence: its last two words aren't tied (that left "DB" alone above
 * "Romanian deadlift").
 */
export const Text = forwardRef<NativeText, TextProps & { ui?: boolean; name?: boolean }>(function Text(
  { style, children, ui, name, ...rest },
  ref,
) {
  const parent = useContext(Parent);
  const { style: next, face } = serif(style, parent, ui);
  // Poster: the display face is set in capitals, as on the poster. The words
  // themselves are capitalised, not the style: a `textTransform` is measured
  // before it is applied, so wider capitals overrun their line and are cut.
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const cased = worn.poster && flat.fontFamily === fonts.display ? upper(children) : children;
  const text = name ? cased : settle(cased);
  return (
    <NativeText ref={ref} style={next} {...rest}>
      {face ? <Parent.Provider value={face}>{text}</Parent.Provider> : text}
    </NativeText>
  );
});

export const TextInput = forwardRef<NativeTextInput, TextInputProps & { ui?: boolean }>(function TextInput(
  { style, ui, ...rest },
  ref,
) {
  return <NativeTextInput ref={ref} style={serif(style, null, ui).style} {...rest} />;
});
