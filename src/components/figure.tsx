import { GLView, type ExpoWebGLRenderingContext } from "expo-gl";
import { useEffect, useRef, useState } from "react";
import { View, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as THREE from "three";

import { Text } from "@/components/text";
import { createStage, FIGURE_MOVES, type FigureMove } from "@/figure/stage";
import { useReduceMotion } from "@/lib/use-reduce-motion";

/**
 * three.js keeps a little bookkeeping with `FinalizationRegistry` and
 * `WeakRef`, to forget objects once the phone has thrown them away. Expo Go's
 * JavaScript engine may have neither. Stand-ins that skip the forgetting are
 * safe here: the figure frees everything itself when it closes (dispose).
 */
const g = globalThis as { FinalizationRegistry?: unknown; WeakRef?: unknown };
if (typeof g.FinalizationRegistry === "undefined") {
  g.FinalizationRegistry = class {
    register() {}
    unregister() {
      return false;
    }
  };
}
if (typeof g.WeakRef === "undefined") {
  g.WeakRef = class<T> {
    constructor(private readonly target: T) {}
    deref() {
      return this.target;
    }
  };
}

/** Whether this exercise has a move for the live figure. */
export const hasFigure = (id: string): id is FigureMove => (FIGURE_MOVES as string[]).includes(id);

/** One turn round the figure takes this long: side, back, side, front. */
const TURN_SECONDS = 24;
/** After a drag, the figure is left where you put it this long before turning on. */
const HOLD_SECONDS = 4;
/** How far a drag across the whole picture turns the figure. */
const DRAG_TURN = Math.PI * 1.2;

const COLORS = { paper: "#FFFFFF", ink: "#1C1C1A", shadow: "#D6D2CA", glow: "#E5533D" };
const STAGE = "#ECEAE5";

/**
 * three.js (r163 on) refuses any context that is `instanceof
 * WebGLRenderingContext`, to keep WebGL 1 out. Expo Go's GL makes its WebGL 2
 * context an instance of both, so a real WebGL 2 context is refused too.
 * When the context says it is WebGL 2, that one check is hidden while the
 * renderer is made; a true WebGL 1 context is still turned away.
 */
function rendererFor(gl: ExpoWebGLRenderingContext, canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const g = globalThis as { WebGLRenderingContext?: unknown };
  const webgl1 = g.WebGLRenderingContext;
  const webgl2 = (gl as { supportsWebGL2?: boolean }).supportsWebGL2 !== false;
  if (webgl2) g.WebGLRenderingContext = undefined;
  try {
    return new THREE.WebGLRenderer({
      canvas,
      context: gl as unknown as WebGL2RenderingContext,
      antialias: true,
    });
  } finally {
    g.WebGLRenderingContext = webgl1;
  }
}

/**
 * Our little friend doing the move, drawn live: it slowly walks round so the
 * move is seen from every side, and a drag turns it by hand. Nothing to tap.
 * With Reduce Motion it stays still at the three-quarter view and only the
 * rep moves.
 */
export function Figure({ move, style }: { move: FigureMove; style?: ViewStyle }) {
  const still = useReduceMotion();
  const [broken, setBroken] = useState(false);
  const width = useRef(1);
  const yaw = useRef({ offset: 0, from: 0, heldAt: -Infinity });
  const clock = useRef(0);
  const stop = useRef<() => void>(() => {});
  useEffect(() => () => stop.current(), []);

  const drag = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-8, 8])
    .onStart(() => {
      yaw.current.from = yaw.current.offset;
    })
    .onUpdate((e) => {
      yaw.current.offset = yaw.current.from + (e.translationX / width.current) * DRAG_TURN;
      yaw.current.heldAt = clock.current;
    })
    .onEnd(() => {
      yaw.current.heldAt = clock.current;
    });

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    // three asks a canvas for a few things; expo-gl's context has no canvas.
    const canvas = {
      width: w,
      height: h,
      clientWidth: w,
      clientHeight: h,
      style: {},
      addEventListener: () => {},
      removeEventListener: () => {},
      getContext: () => gl,
    } as unknown as HTMLCanvasElement;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = rendererFor(gl, canvas);
    } catch (error) {
      console.warn("The figure can't be drawn on this phone:", error);
      setBroken(true);
      return;
    }
    renderer.setPixelRatio(1);
    renderer.setSize(w, h, false);
    renderer.setClearColor(STAGE, 1);
    const stage = createStage(move, COLORS, w / h);

    // The turn goes on from wherever a drag left it.
    let turned = 0.8;
    let last = Date.now();
    let frame = 0;
    const tick = () => {
      const now = Date.now();
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      clock.current += dt;
      if (!still && clock.current - yaw.current.heldAt > HOLD_SECONDS) {
        turned += (dt / TURN_SECONDS) * Math.PI * 2;
      }
      stage.render(renderer, clock.current, turned + yaw.current.offset);
      gl.endFrameEXP();
      frame = requestAnimationFrame(tick);
    };
    tick();
    stop.current = () => {
      cancelAnimationFrame(frame);
      stage.dispose();
      renderer.dispose();
    };
  };

  return (
    <GestureDetector gesture={drag}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel="The move, shown by a figure that turns so you can see it from every side. Drag to turn it."
        onLayout={(e) => (width.current = Math.max(1, e.nativeEvent.layout.width))}
        style={[{ overflow: "hidden", backgroundColor: STAGE }, style]}
      >
        {broken ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
            <Text style={{ textAlign: "center", fontSize: 16, lineHeight: 22, color: COLORS.ink }}>
              This phone can't show the moving figure. The steps below say the same.
            </Text>
          </View>
        ) : (
          <GLView style={{ flex: 1 }} msaaSamples={4} onContextCreate={onContextCreate} />
        )}
      </View>
    </GestureDetector>
  );
}
