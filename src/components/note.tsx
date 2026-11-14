import { useState } from "react";
import { Pressable, View } from "react-native";

import { useColors } from "@/components/field";
import { Icon } from "@/components/icon";
import { Sheet, TextButton } from "@/components/sheet";
import { Text, TextInput } from "@/components/text";
import { colors, fonts } from "@/constants/theme";
import { NOTE_MAX, noteFor, setNote, sessionNoteFor, setSessionNote, useSession } from "@/store/session";

/**
 * Notes to yourself: one per exercise or machine — "speed 10.5, incline 1",
 * "seat on 4" — that stays until you change it. Nothing shows until there is
 * one; then it is your own words under the name, and tapping them edits.
 */

type Kind = "lift" | "cardio";

/** Your note, on screen: a pencil and your words. Tap to change them. */
export function NoteLine({
  text,
  lines = 2,
  size = 17,
  center,
  onPress,
}: {
  text: string;
  lines?: number;
  size?: number;
  /** Under a centred name: the pencil and words sit together in the middle. */
  center?: boolean;
  onPress: () => void;
}) {
  const field = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Your note: ${text}. Tap to change it`}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "flex-start",
        alignSelf: center ? "center" : undefined,
        gap: 8,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ height: size * 1.35, justifyContent: "center" }}>
        <Icon name="note" size={size * 0.85} color={field.muted} />
      </View>
      <Text
        numberOfLines={lines}
        style={{
          ...(center ? { flexShrink: 1 } : { flex: 1 }),
          color: field.text,
          fontFamily: fonts.regular,
          fontSize: size,
          lineHeight: size * 1.35,
        }}
      >
        {text}
      </Text>
    </Pressable>
  );
}

/**
 * Write the note. It saves as you type, like everything else in Plan, and
 * Return is done — a note is a line or two, not paragraphs.
 */
export function NoteField({
  id,
  kind = "lift",
  autoFocus,
  sessionOnly = false,
  hint,
  onDone,
}: {
  id: string;
  kind?: Kind;
  autoFocus?: boolean;
  sessionOnly?: boolean;
  hint: string;
  onDone?: () => void;
}) {
  const { state, setState } = useSession();
  // Kept here as typed: the store trims what it shows, not what you type.
  const [draft, setDraft] = useState(() => sessionOnly ? sessionNoteFor(state, id, kind) : noteFor(state, id, kind));

  return (
    <View style={{ gap: 10 }}>
      <TextInput
        value={draft}
        onChangeText={(text) => {
          const line = text.replace(/\s*\n\s*/g, " ");
          setDraft(line);
          setState((s) => sessionOnly ? setSessionNote(s, id, line, kind) : setNote(s, id, line, kind));
        }}
        autoFocus={autoFocus}
        multiline
        submitBehavior="blurAndSubmit"
        returnKeyType="done"
        onSubmitEditing={onDone}
        maxLength={NOTE_MAX}
        accessibilityLabel="Note"
        placeholder="Speed, seat height, grip — whatever helps next time"
        placeholderTextColor={colors.faint}
        selectionColor={colors.text}
        style={{
          minHeight: 96,
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 14,
          borderRadius: 16,
          backgroundColor: colors.surface,
          color: colors.text,
          fontSize: 19,
          lineHeight: 26,
          textAlignVertical: "top",
        }}
      />
      <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>
        {draft.length >= NOTE_MAX - 20 ? `${NOTE_MAX - draft.length} characters left. ` : ""}
        {hint}
      </Text>
    </View>
  );
}

/** The note, opened from the workout: write it, or take it away. */
export function NoteSheet({
  visible,
  id,
  kind = "lift",
  name,
  onClose,
}: {
  visible: boolean;
  id: string;
  kind?: Kind;
  name: string;
  onClose: () => void;
}) {
  const { state, setState } = useSession();
  const has = !!sessionNoteFor(state, id, kind);

  return (
    <Sheet visible={visible} title={name} closeLabel="Done" onClose={onClose}>
      {/* Mounted only while open, so the field starts from the note as it is now. */}
      {visible ? (
        <View style={{ gap: 12, paddingTop: 8 }}>
          <NoteField
            id={id}
            kind={kind}
            autoFocus
            sessionOnly
            hint="For this session only. Edit the exercise in Plan to save a usual note."
            onDone={onClose}
          />
          {has ? (
            <TextButton
              label="Delete note"
              onPress={() => {
                setState((s) => setSessionNote(s, id, "", kind));
                onClose();
              }}
            />
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}
