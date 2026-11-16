import { createContext, useContext, useEffect, useId, useRef, useState, type PropsWithChildren } from "react";
import { InputAccessoryView, Keyboard, Platform, Pressable, ScrollView, View, type TextInput as NativeTextInput, type TextInputProps } from "react-native";
import { Text, TextInput } from "@/components/text";
import { colors } from "@/constants/theme";

type Focus = { focus: (input: NativeTextInput) => void; blur: (input: NativeTextInput) => void; touchedInput: () => void };
const InputFocus = createContext<Focus | null>(null);

/** Numeric keyboards need an explicit way out on iOS. */
export function CardioInput({ onFocus, onBlur, onSubmitEditing, onTouchEnd, ...props }: TextInputProps) {
  const input = useRef<NativeTextInput>(null);
  const focus = useContext(InputFocus);
  const accessory = useId();
  return (
    <>
      <TextInput {...props} ref={input} inputAccessoryViewID={Platform.OS === "ios" ? accessory : undefined}
        underlineColorAndroid="transparent"
        returnKeyType="done" submitBehavior="blurAndSubmit"
        onFocus={(event) => { if (input.current) focus?.focus(input.current); onFocus?.(event); }}
        onBlur={(event) => { if (input.current) focus?.blur(input.current); onBlur?.(event); }}
        onTouchEnd={(event) => { focus?.touchedInput(); onTouchEnd?.(event); }}
        onSubmitEditing={(event) => { onSubmitEditing?.(event); Keyboard.dismiss(); }} />
      {Platform.OS === "ios" ? (
        <InputAccessoryView nativeID={accessory} backgroundColor={colors.bg}>
          <View style={{ alignItems: "flex-end", borderTopWidth: 1, borderColor: colors.line, paddingHorizontal: 16 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Dismiss keyboard" onPress={() => Keyboard.dismiss()}
              style={({ pressed }) => ({ minWidth: 64, minHeight: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ color: colors.text, fontSize: 19 }}>Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </>
  );
}

/** Fixed at rest; only an open keyboard allows scrolling to the focused field. */
export function CardioKeyboardArea({ children }: PropsWithChildren) {
  const scroll = useRef<ScrollView>(null);
  const focused = useRef<NativeTextInput | null>(null);
  const keyboardTop = useRef<number | null>(null);
  const offset = useRef(0);
  const inputTouched = useRef(false);
  const dragging = useRef(false);
  const [editing, setEditing] = useState(false);
  const [height, setHeight] = useState(0);
  const [inset, setInset] = useState(0);
  const frame = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  const reveal = () => {
    if (!scroll.current || !focused.current) return;
    scroll.current.getNativeScrollRef()?.measureInWindow((_x, y, _width, viewportHeight) => {
      const top = keyboardTop.current;
      const padding = top === null ? 0 : Math.max(0, y + viewportHeight - top) + 60;
      setInset(padding);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        focused.current?.measureInWindow((_ix, inputY, _iw, inputHeight) => {
          const bottom = top === null ? y + viewportHeight - 16 : Math.min(y + viewportHeight - 16, top - 60);
          const delta = inputY + inputHeight > bottom ? inputY + inputHeight - bottom : inputY < y + 12 ? inputY - y - 12 : 0;
          if (delta) scroll.current?.scrollTo({ y: Math.max(0, offset.current + delta), animated: true });
        });
      });
    });
  };
  const reset = () => {
    keyboardTop.current = null;
    setEditing(false);
    setInset(0);
    scroll.current?.scrollTo({ y: 0, animated: false });
    offset.current = 0;
  };
  useEffect(() => {
    const show = (event: { endCoordinates: { screenY: number } }) => { keyboardTop.current = event.endCoordinates.screenY; if (focused.current) { setEditing(true); reveal(); } };
    const subscriptions = [Keyboard.addListener("keyboardWillShow", show), Keyboard.addListener("keyboardDidShow", show), Keyboard.addListener("keyboardDidHide", reset)];
    const viewport = Platform.OS === "web" && typeof window !== "undefined" ? window.visualViewport : null;
    const resize = () => { if (viewport && focused.current) { keyboardTop.current = viewport.offsetTop + viewport.height; reveal(); } };
    viewport?.addEventListener("resize", resize);
    return () => { subscriptions.forEach((subscription) => subscription.remove()); viewport?.removeEventListener("resize", resize); if (frame.current !== null) cancelAnimationFrame(frame.current); };
  }, []);

  return (
    <InputFocus.Provider value={{
      focus: (input) => { focused.current = input; setEditing(true); reveal(); },
      blur: (input) => { if (focused.current === input) { focused.current = null; reset(); } },
      touchedInput: () => { inputTouched.current = true; },
    }}>
      <ScrollView ref={scroll} style={{ flex: 1 }} scrollEnabled={editing} bounces={false} overScrollMode="never"
        keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" scrollEventThrottle={16}
        onTouchStart={() => { inputTouched.current = false; dragging.current = false; }}
        onTouchMove={() => { dragging.current = true; }}
        onTouchEnd={() => { if (!inputTouched.current && !dragging.current) Keyboard.dismiss(); }}
        onScroll={(event) => { offset.current = event.nativeEvent.contentOffset.y; }}
        onLayout={(event) => { setHeight(event.nativeEvent.layout.height); if (focused.current) reveal(); }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: inset }}>
        <View style={{ minHeight: height, justifyContent: "space-evenly", paddingTop: 10, paddingBottom: 14, gap: 12 }}>
          {children}
        </View>
      </ScrollView>
    </InputFocus.Provider>
  );
}
