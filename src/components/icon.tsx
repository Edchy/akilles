import type { ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";

/**
 * Every icon in the app, by what it means rather than what it looks like.
 *
 * Phosphor Icons in their Bold weight (phosphor-icons.com, MIT licence),
 * copied in as plain paths on Phosphor's 256 grid, so the phone, Android and
 * the web preview all draw the same thing. `phosphor` names each drawing, to
 * find it again or swap it for another. The tabs say what is behind them:
 * Today the weights waiting for you, Progress the stairs you climb a rung at
 * a time, Plan the grid of your workouts and exercises. The workout bar is
 * Back, a door out (the workout waits on Today for you to come back), and
 * Skip.
 */
const ICONS = {
  today: {
    phosphor: "barbell",
    d: "M244 116V88a20 20 0 0 0-20-20h-16v-4a20 20 0 0 0-20-20h-24a20 20 0 0 0-20 20v52h-32V64a20 20 0 0 0-20-20H68a20 20 0 0 0-20 20v4H32a20 20 0 0 0-20 20v28a12 12 0 0 0 0 24v28a20 20 0 0 0 20 20h16v4a20 20 0 0 0 20 20h24a20 20 0 0 0 20-20v-52h32v52a20 20 0 0 0 20 20h24a20 20 0 0 0 20-20v-4h16a20 20 0 0 0 20-20v-28a12 12 0 0 0 0-24M36 164V92h12v72Zm52 24H72V68h16Zm96 0h-16V68h16Zm36-24h-12V92h12Z",
  },
  progress: {
    phosphor: "stairs",
    d: "M200 20H56a20 20 0 0 0-20 20v176a20 20 0 0 0 20 20h144a20 20 0 0 0 20-20V40a20 20 0 0 0-20-20m-48 128h44v16h-80v-16Zm12-24v-16h32v16Zm32-80v40h-44a12 12 0 0 0-12 12v28h-36a12 12 0 0 0-12 12v28H60V44ZM60 212v-24h136v24Z",
  },
  plan: {
    phosphor: "squares-four",
    d: "M100 36H56a20 20 0 0 0-20 20v44a20 20 0 0 0 20 20h44a20 20 0 0 0 20-20V56a20 20 0 0 0-20-20m-4 60H60V60h36Zm104-60h-44a20 20 0 0 0-20 20v44a20 20 0 0 0 20 20h44a20 20 0 0 0 20-20V56a20 20 0 0 0-20-20m-4 60h-36V60h36Zm-96 40H56a20 20 0 0 0-20 20v44a20 20 0 0 0 20 20h44a20 20 0 0 0 20-20v-44a20 20 0 0 0-20-20m-4 60H60v-36h36Zm104-60h-44a20 20 0 0 0-20 20v44a20 20 0 0 0 20 20h44a20 20 0 0 0 20-20v-44a20 20 0 0 0-20-20m-4 60h-36v-36h36Z",
  },
  previous: {
    phosphor: "caret-left",
    d: "M168.49 199.51a12 12 0 0 1-17 17l-80-80a12 12 0 0 1 0-17l80-80a12 12 0 0 1 17 17L97 128Z",
  },
  leave: {
    phosphor: "door-open",
    d: "M232 212h-20V40a20 20 0 0 0-20-20H64a20 20 0 0 0-20 20v172H24a12 12 0 0 0 0 24h208a12 12 0 0 0 0-24m-44 0h-16V44h16ZM68 44h80v168H68Zm68 84a16 16 0 1 1-16-16a16 16 0 0 1 16 16",
  },
  next: {
    phosphor: "caret-double-right",
    d: "m144.49 136.49l-80 80a12 12 0 0 1-17-17L119 128L47.51 56.49a12 12 0 0 1 17-17l80 80a12 12 0 0 1-.02 17m80-17l-80-80a12 12 0 1 0-17 17L199 128l-71.52 71.51a12 12 0 0 0 17 17l80-80a12 12 0 0 0 .01-17Z",
  },
  back: {
    phosphor: "arrow-left",
    d: "M228 128a12 12 0 0 1-12 12H69l51.52 51.51a12 12 0 0 1-17 17l-72-72a12 12 0 0 1 0-17l72-72a12 12 0 0 1 17 17L69 116h147a12 12 0 0 1 12 12",
  },
  forward: {
    phosphor: "arrow-right",
    d: "m224.49 136.49l-72 72a12 12 0 0 1-17-17L187 140H40a12 12 0 0 1 0-24h147l-51.49-51.52a12 12 0 0 1 17-17l72 72a12 12 0 0 1-.02 17.01",
  },
  close: {
    phosphor: "x",
    d: "M208.49 191.51a12 12 0 0 1-17 17L128 145l-63.51 63.49a12 12 0 0 1-17-17L111 128L47.51 64.49a12 12 0 0 1 17-17L128 111l63.51-63.52a12 12 0 0 1 17 17L145 128Z",
  },
  swap: {
    phosphor: "arrows-left-right",
    d: "m216.49 184.49l-32 32a12 12 0 0 1-17-17L179 188H48a12 12 0 0 1 0-24h131l-11.52-11.51a12 12 0 0 1 17-17l32 32a12 12 0 0 1 .01 17m-145-64a12 12 0 0 0 17-17L77 92h131a12 12 0 0 0 0-24H77l11.49-11.51a12 12 0 0 0-17-17l-32 32a12 12 0 0 0 0 17Z",
  },
  plus: {
    phosphor: "plus",
    d: "M228 128a12 12 0 0 1-12 12h-76v76a12 12 0 0 1-24 0v-76H40a12 12 0 0 1 0-24h76V40a12 12 0 0 1 24 0v76h76a12 12 0 0 1 12 12",
  },
  minus: {
    phosphor: "minus",
    d: "M228 128a12 12 0 0 1-12 12H40a12 12 0 0 1 0-24h176a12 12 0 0 1 12 12",
  },
  check: {
    phosphor: "check",
    d: "m232.49 80.49l-128 128a12 12 0 0 1-17 0l-56-56a12 12 0 1 1 17-17L96 183L215.51 63.51a12 12 0 0 1 17 17Z",
  },
  expand: {
    phosphor: "caret-down",
    d: "m216.49 104.49l-80 80a12 12 0 0 1-17 0l-80-80a12 12 0 0 1 17-17L128 159l71.51-71.52a12 12 0 0 1 17 17Z",
  },
  open: {
    phosphor: "caret-right",
    d: "m184.49 136.49l-80 80a12 12 0 0 1-17-17L159 128L87.51 56.49a12 12 0 1 1 17-17l80 80a12 12 0 0 1-.02 17",
  },
  collapse: {
    phosphor: "caret-up",
    d: "M216.49 168.49a12 12 0 0 1-17 0L128 97l-71.51 71.49a12 12 0 0 1-17-17l80-80a12 12 0 0 1 17 0l80 80a12 12 0 0 1 0 17",
  },
  stretch: {
    phosphor: "person-simple-tai-chi",
    d: "M128 84a36 36 0 1 0-36-36a36 36 0 0 0 36 36m0-48a12 12 0 1 1-12 12a12 12 0 0 1 12-12m100 72a12 12 0 0 1-12 12h-76v16.09L188.73 157a12 12 0 0 1 7.27 11v48a12 12 0 0 1-24 0v-40.09l-41.67-17.86L56 224.92a12 12 0 0 1-16-17.84l76-68.42V120H40a12 12 0 0 1 0-24h176a12 12 0 0 1 12 12",
  },
  info: {
    phosphor: "info",
    d: "M108 84a16 16 0 1 1 16 16a16 16 0 0 1-16-16m128 44A108 108 0 1 1 128 20a108.12 108.12 0 0 1 108 108m-24 0a84 84 0 1 0-84 84a84.09 84.09 0 0 0 84-84m-72 36.68V132a20 20 0 0 0-20-20a12 12 0 0 0-4 23.32V168a20 20 0 0 0 20 20a12 12 0 0 0 4-23.32",
  },
  timer: {
    phosphor: "timer",
    d: "M128 44a96 96 0 1 0 96 96a96.11 96.11 0 0 0-96-96m0 168a72 72 0 1 1 72-72a72.08 72.08 0 0 1-72 72m36.49-112.49a12 12 0 0 1 0 17l-28 28a12 12 0 0 1-17-17l28-28a12 12 0 0 1 17 0M92 16a12 12 0 0 1 12-12h48a12 12 0 0 1 0 24h-48a12 12 0 0 1-12-12",
  },
  search: {
    phosphor: "magnifying-glass",
    d: "M232.49 215.51L185 168a92.12 92.12 0 1 0-17 17l47.53 47.54a12 12 0 0 0 17-17ZM44 112a68 68 0 1 1 68 68a68.07 68.07 0 0 1-68-68",
  },
  note: {
    phosphor: "note",
    d: "M84 108a12 12 0 0 1 12-12h64a12 12 0 0 1 0 24H96a12 12 0 0 1-12-12m32 28H96a12 12 0 0 0 0 24h20a12 12 0 0 0 0-24m112-88v108.69a19.86 19.86 0 0 1-5.86 14.14l-51.31 51.31a19.86 19.86 0 0 1-14.14 5.86H48a20 20 0 0 1-20-20V48a20 20 0 0 1 20-20h160a20 20 0 0 1 20 20M52 204h92v-48a12 12 0 0 1 12-12h48V52H52Zm139-36h-23v23Z",
  },
  play: {
    phosphor: "play",
    d: "M234.49 111.07L90.41 22.94A20 20 0 0 0 60 39.87v176.26a20 20 0 0 0 30.41 16.93l144.08-88.13a19.82 19.82 0 0 0 0-33.86M84 208.85V47.15L216.16 128Z",
  },
  more: {
    phosphor: "dots-three",
    d: "M144 128a16 16 0 1 1-16-16a16 16 0 0 1 16 16m-84-16a16 16 0 1 0 16 16a16 16 0 0 0-16-16m136 0a16 16 0 1 0 16 16a16 16 0 0 0-16-16",
  },
} as const satisfies Record<string, { phosphor: string; d: string }>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size, color }: { name: IconName; size: number; color: ColorValue }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256">
      <Path d={ICONS[name].d} fill={color} />
    </Svg>
  );
}
