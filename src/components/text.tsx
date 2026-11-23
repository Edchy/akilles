import { createContext, forwardRef, useContext, type ReactNode } from "react";
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";

import { LINE } from "@/constants/font-lines";
import { fonts } from "@/constants/theme";
import { noOrphan } from "@/lib/typography";

/**
 * Every word in the app is M PLUS Rounded, but for names and headings, which
 * name Bebas Neue (`fonts.display`) themselves. These stand in for React
 * Native's `Text` and `TextInput` so that an ordinary `fontWeight` picks the
 * matching file — custom faces ignore `fontWeight` on iOS, and on the web a
 * weight on top of a named file is a faked bold. A style that names its own
 * `fontFamily` is taken as meant.
 */

type Face = { weight: TextStyle["fontWeight"]; italic: boolean; ui: boolean };


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
  // system face, and the rounded face's boldest weights are heavy for small text.
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
  // Every number in the app is data, so figures stand at cap height unless
  // asked otherwise (a face with old-style figures would let them wander).
  const variant = flat.fontVariant ?? [];
  const lining: TextStyle | null = variant.includes("oldstyle-nums") || variant.includes("lining-nums")
    ? null
    : { fontVariant: [...variant, "lining-nums"] };
  if (flat.fontFamily) {
    const room = roomAbove(flat);
    return { style: lining || room ? [style, lining, room] : style, face: null };
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
  const room = roomAbove({ ...flat, ...extra });
  return { style: [style, extra, room], face };
}

/**
 * A line too short for its font, given the height the font needs (see
 * `LINE`): iOS keeps the foot of the line and cuts off whatever rises above
 * it — the tops of a 7.5 in a rounded face, set on a line exactly its size. The extra
 * height is all taken back above, by the top margin, so the baseline and
 * everything around it stay exactly where they were.
 */
function roomAbove(flat: TextStyle): TextStyle | null {
  const { fontFamily, fontSize, lineHeight } = flat;
  if (!fontFamily || typeof fontSize !== "number" || typeof lineHeight !== "number") return null;
  const need = LINE[fontFamily];
  if (!need) return null;
  const whole = Math.ceil(fontSize * need);
  if (lineHeight >= whole) return null;
  const top = flat.marginTop ?? flat.marginVertical ?? flat.margin;
  return { lineHeight: whole, marginTop: (typeof top === "number" ? top : 0) - (whole - lineHeight) };
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
  const text = name ? children : settle(children);
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
