import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Animated, PanResponder, View, type LayoutChangeEvent } from "react-native";

/** What each row gets to wire its own press-and-hold to. */
export type Drag = {
  /** Call from a long press: the row lifts and follows the finger from here. */
  start: () => void;
  /**
   * Call from the same Pressable's press-out. Ends a drag that was started
   * but never moved — a long press and let go — and does nothing otherwise.
   */
  cancel: () => void;
  /** This row is the one being dragged. */
  active: boolean;
  /** Step the row one place, for screen readers — dragging is not an option there. */
  moveBy: (step: -1 | 1) => void;
  index: number;
  count: number;
};

/**
 * A vertical list you reorder by holding a row and dragging it.
 *
 * Plain `Animated` and `PanResponder`, so it needs no native modules. Rows can
 * be any height and can change height (an expanded card is still draggable);
 * each is measured as it lays out. Lists nest — a row can hold a DragList of
 * its own — since each list only claims the gesture when one of its own rows
 * has been lifted.
 *
 * The finger is already down when the long press fires, so the list takes
 * over the gesture on the next move. `onDragChange` lets the host freeze its
 * ScrollView meanwhile, or the drag would scroll the page too.
 */
export function DragList<T>({
  data,
  keyOf,
  renderItem,
  onMove,
  onDragChange,
  gap = 0,
}: {
  data: T[];
  keyOf: (item: T) => string;
  renderItem: (item: T, drag: Drag) => ReactNode;
  onMove: (from: number, to: number) => void;
  onDragChange?: (dragging: boolean) => void;
  gap?: number;
}) {
  const layouts = useRef(new Map<string, { y: number; height: number }>());
  const offsets = useRef(new Map<string, Animated.Value>());
  const offset = (k: string) => {
    let v = offsets.current.get(k);
    if (!v) {
      v = new Animated.Value(0);
      offsets.current.set(k, v);
    }
    return v;
  };

  // The live drag. A ref, because the responder callbacks are created once.
  const drag = useRef<{ from: number; to: number; granted: boolean } | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  // The responder callbacks outlive renders, so read the latest props here.
  const latest = useRef({ data, keyOf, onMove, onDragChange, gap });
  latest.current = { data, keyOf, onMove, onDragChange, gap };

  const keys = data.map(keyOf);

  // Offsets are zeroed only once the new order has rendered, so the rows go
  // straight from their shifted places to their real ones with no flash of
  // the old order in between.
  const signature = keys.join("|");
  useLayoutEffect(() => {
    offsets.current.forEach((v) => v.setValue(0));
  }, [signature]);

  const begin = (index: number) => {
    drag.current = { from: index, to: index, granted: false };
    setActiveKey(keyOf(data[index]));
    onDragChange?.(true);
  };

  const end = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setActiveKey(null);
    latest.current.onDragChange?.(false);
    if (d.to !== d.from) {
      latest.current.onMove(d.from, d.to);
    } else {
      offsets.current.forEach((v) =>
        Animated.spring(v, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start(),
      );
    }
  };

  const follow = (dy: number) => {
    const d = drag.current;
    if (!d) return;
    const { data, keyOf, gap } = latest.current;
    const ks = data.map(keyOf);
    const me = layouts.current.get(ks[d.from]);
    if (!me) return;
    offset(ks[d.from]).setValue(dy);

    // Where the row's middle now sits decides the slot it would drop into.
    const middle = me.y + dy + me.height / 2;
    let to = d.from;
    ks.forEach((k, j) => {
      const l = layouts.current.get(k);
      if (!l || j === d.from) return;
      const mid = l.y + l.height / 2;
      if (j > d.from && middle > mid) to = Math.max(to, j);
      if (j < d.from && middle < mid) to = Math.min(to, j);
    });

    if (to === d.to) return;
    d.to = to;
    // Everything between the old place and the new one steps aside by the
    // dragged row's height.
    const step = me.height + gap;
    ks.forEach((k, j) => {
      if (j === d.from) return;
      const shift =
        j > d.from && j <= to ? -step : j < d.from && j >= to ? step : 0;
      Animated.timing(offset(k), {
        toValue: shift,
        duration: 140,
        useNativeDriver: false,
      }).start();
    });
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      // Only claim the gesture once one of this list's rows has been lifted.
      onMoveShouldSetPanResponderCapture: () => drag.current !== null,
      onPanResponderGrant: () => {
        if (drag.current) drag.current.granted = true;
      },
      onPanResponderMove: (_, g) => follow(g.dy),
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  return (
    <View {...responder.panHandlers} style={{ gap }}>
      {data.map((item, index) => {
        const k = keys[index];
        const active = k === activeKey;
        return (
          <Animated.View
            key={k}
            onLayout={(e: LayoutChangeEvent) => {
              const { y, height } = e.nativeEvent.layout;
              layouts.current.set(k, { y, height });
            }}
            style={{
              transform: [{ translateY: offset(k) }],
              zIndex: active ? 1 : 0,
              opacity: activeKey && !active ? 0.85 : 1,
            }}
          >
            {renderItem(item, {
              start: () => begin(index),
              cancel: () => {
                // The press ends both when you let go and when the list takes
                // the gesture over. Wait a tick so a grant has landed first.
                setTimeout(() => {
                  if (drag.current && !drag.current.granted) end();
                }, 0);
              },
              active,
              moveBy: (step) => {
                const to = index + step;
                if (to >= 0 && to < data.length) onMove(index, to);
              },
              index,
              count: data.length,
            })}
          </Animated.View>
        );
      })}
    </View>
  );
}
