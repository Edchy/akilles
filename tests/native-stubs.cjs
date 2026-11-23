/**
 * Stand-ins for the native libraries a screen pulls in — animation, gestures,
 * drawing — which can't load in plain Node. Each test that renders a screen
 * asks here first: `nativeStub(name)` is the stand-in, or undefined.
 */
const chain = new Proxy(function () {}, { get: () => () => chain, apply: () => chain });
const component = (name) => name;
const stubs = {
  "react-native-reanimated": () => {
    const Animated = { View: "AnimatedView", Text: "AnimatedText", ScrollView: "AnimatedScrollView", createAnimatedComponent: (c) => c };
    return {
      __esModule: true,
      default: Animated,
      ...Animated,
      useSharedValue: (value) => ({ value }),
      useAnimatedStyle: () => ({}),
      useAnimatedProps: () => ({}),
      useDerivedValue: (fn) => ({ value: fn() }),
      useAnimatedReaction: () => {},
      useAnimatedRef: () => ({ current: null }),
      useReducedMotion: () => true,
      withSpring: (v) => v,
      withTiming: (v) => v,
      withDelay: (_, v) => v,
      withSequence: (...v) => v[v.length - 1],
      withRepeat: (v) => v,
      cancelAnimation: () => {},
      interpolate: () => 0,
      Extrapolation: { CLAMP: "clamp" },
      Easing: new Proxy({}, { get: () => () => (t) => t }),
      FadeIn: chain,
      FadeOut: chain,
      LinearTransition: chain,
    };
  },
  "react-native-worklets": () => ({ scheduleOnRN: (fn, ...args) => fn(...args), scheduleOnUI: (fn, ...args) => fn(...args), runOnJS: (fn) => fn, runOnUI: (fn) => fn }),
  "react-native-gesture-handler": () => ({
    Gesture: new Proxy({}, { get: () => () => chain }),
    GestureDetector: component("GestureDetector"),
    GestureHandlerRootView: component("GestureHandlerRootView"),
  }),
  // Swipe-to-remove rows (see components/swipe.tsx): drawn as their contents.
  "react-native-gesture-handler/ReanimatedSwipeable": () => ({ __esModule: true, default: "ReanimatedSwipeable" }),
  "react-native-svg": () =>
    new Proxy({ __esModule: true, default: "Svg" }, { get: (target, key) => (key in target ? target[key] : String(key)) }),
  "expo-haptics": () => new Proxy({}, { get: () => () => Promise.resolve() }),
  "expo-keep-awake": () => ({ useKeepAwake: () => {}, activateKeepAwakeAsync: async () => {}, deactivateKeepAwake: async () => {} }),
};
const made = new Map();
exports.nativeStub = (name) => {
  if (!(name in stubs)) return undefined;
  if (!made.has(name)) made.set(name, stubs[name]());
  return made.get(name);
};
