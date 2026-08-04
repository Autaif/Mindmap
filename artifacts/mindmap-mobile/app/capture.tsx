import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { KindPicker } from '@/components/KindPicker';
import { useColors } from '@/hooks/useColors';
import { useNodes } from '@/lib/NodesContext';
import { NodeKind } from '@/lib/types';

export default function CaptureScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addNode } = useNodes();

  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [kind, setKind] = useState<NodeKind>('concern');

  const canSave = title.trim().length > 0;

  const save = () => {
    if (!canSave) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addNode({ title, kind, detail });
    router.back();
  };

  const topInset = Platform.OS === 'web' ? 24 : 0;
  const bottomInset = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset + 20, paddingBottom: bottomInset + 24 },
        ]}
      >
        <Text style={[styles.heading, { color: colors.foreground }]}>
          Capture a thought
        </Text>

        <KindPicker value={kind} onChange={setKind} />

        <TextInput
          testID="capture-title"
          value={title}
          onChangeText={setTitle}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.mutedForeground}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={save}
          style={[
            styles.titleInput,
            {
              color: colors.foreground,
              backgroundColor: colors.card,
              borderColor: colors.input,
              borderRadius: colors.radius,
            },
          ]}
        />

        <TextInput
          testID="capture-detail"
          value={detail}
          onChangeText={setDetail}
          placeholder="Details (optional)"
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={[
            styles.detailInput,
            {
              color: colors.foreground,
              backgroundColor: colors.card,
              borderColor: colors.input,
              borderRadius: colors.radius,
            },
          ]}
        />

        <Pressable
          testID="capture-save"
          onPress={save}
          disabled={!canSave}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: colors.primary,
              borderRadius: colors.radius,
              opacity: !canSave ? 0.4 : pressed ? 0.8 : 1,
            },
          ]}
        >
          <Feather name="plus-circle" size={18} color={colors.primaryForeground} />
          <Text style={[styles.saveText, { color: colors.primaryForeground }]}>
            Add to map
          </Text>
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  heading: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  titleInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  detailInput: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    minHeight: 96,
    textAlignVertical: 'top',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  saveText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
