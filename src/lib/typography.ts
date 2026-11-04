/**
 * No orphans: a paragraph never ends on one word alone on its last line.
 *
 * The last two words are tied with a no-break space, so they wrap together —
 * "…staying tight. Then / stand." becomes "…staying tight. / Then stand." —
 * which every platform honours, unlike the iOS and Android line-breaking
 * options that only some text views respect.
 *
 * Left alone: a string of one or two words, which is a label rather than a
 * paragraph and should be free to wrap in a narrow spot; and a long pair,
 * since tying two long words together can leave a worse gap above them.
 */

const NBSP = "\u00A0";

/** Longest pair of last words worth tying, in characters. */
const LONGEST_PAIR = 20;

export const noOrphan = (text: string): string => {
  const last = /[ \t]+(\S+)(\s*)$/.exec(text);
  if (!last) return text;
  const before = text.slice(0, last.index);
  const previous = /(\s|^)(\S+)$/.exec(before);
  // A third word must come before the pair, or this is a label.
  if (!previous || !/\S\s+\S/.test(before)) return text;
  if (previous[2].length + last[1].length + 1 > LONGEST_PAIR) return text;
  return `${before}${NBSP}${last[1]}${last[2]}`;
};
