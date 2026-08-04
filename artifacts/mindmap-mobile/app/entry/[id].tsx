import React, { useState } from 'react';
import {
  Alert,
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { KindPicker } from '@/components/KindPicker';
import { useColors } from '@/hooks/useColors';
import { useNodes } from '@/lib/NodesContext';
import { KIND_META, STATUS_META } from '@/lib/types';

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { nodes, updateNode, deleteNode } = useNodes();

  const node = nodes.find((n) => n.id === id);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(node?.title ?? '');
  const [detail, setDetail] = useState(node?.detail ?? '');

  const bottomInset = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;

  if (!node) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <Feather name="cloud-off" size={28} color={colors.mutedForeground} />
        <Text style={[styles.missingText, { color: colors.mutedForeground }]}>
          This entry no longer exists.
        </Text>
      </View>
    );
  }

  const meta = KIND_META[node.kind];
  const status = STATUS_META[node.status];

  const setStatus = (next: 'open' | 'handled' | 'archived') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateNode(node.id, { status: next });
  };

  const saveEdits = () => {
    if (!title.trim()) return;
    updateNode(node.id, { title: title.trim(), detail: detail.trim() });
    setEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const confirmDelete = () => {
    Alert.alert('Delete entry', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteNode(node.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 32 }]}
      >
        {/* Kind + status */}
        <View style={styles.badgeRow}>
          <View
            style={[styles.kindPill, { backgroundColor: meta.bg, borderColor: meta.border }]}
          >
            <View style={[styles.kindDot, { backgroundColor: meta.color }]} />
            <Text style={[styles.kindText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>

        {editing ? (
          <View style={styles.editBlock}>
            <KindPicker
              value={node.kind}
              onChange={(kind) => updateNode(node.id, { kind })}
            />
            <TextInput
              testID="edit-title"
              value={title}
              onChangeText={setTitle}
              placeholder="Title"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  backgroundColor: colors.card,
                  borderColor: colors.input,
                  borderRadius: colors.radius,
                },
              ]}
            />
            <TextInput
              testID="edit-detail"
              value={detail}
              onChangeText={setDetail}
              placeholder="Details"
              placeholderTextColor={colors.mutedForeground}
              multiline
              style={[
                styles.input,
                styles.multiline,
                {
                  color: colors.foreground,
                  backgroundColor: colors.card,
                  borderColor: colors.input,
                  borderRadius: colors.radius,
                },
              ]}
            />
            <View style={styles.editActions}>
              <Pressable
                testID="edit-cancel"
                onPress={() => {
                  setTitle(node.title);
                  setDetail(node.detail);
                  setEditing(false);
                }}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  {
                    borderColor: colors.border,
                    borderRadius: colors.radius,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.mutedForeground }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                testID="edit-save"
                onPress={saveEdits}
                disabled={!title.trim()}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: colors.radius,
                    opacity: !title.trim() ? 0.4 : pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>
                  Save
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <Text style={[styles.title, { color: colors.foreground }]}>{node.title}</Text>
            {node.detail ? (
              <Text style={[styles.detail, { color: colors.mutedForeground }]}>
                {node.detail}
              </Text>
            ) : null}
            <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
              Updated {new Date(node.updatedAt).toLocaleString()}
            </Text>
          </>
        )}

        {/* Actions */}
        {!editing ? (
          <View style={styles.actions}>
            {node.status !== 'handled' ? (
              <ActionButton
                testID="action-handled"
                icon="check-circle"
                label="Mark handled"
                color="#34d399"
                onPress={() => setStatus('handled')}
              />
            ) : (
              <ActionButton
                testID="action-reopen"
                icon="rotate-ccw"
                label="Reopen"
                color={colors.primary}
                onPress={() => setStatus('open')}
              />
            )}
            {node.status !== 'archived' ? (
              <ActionButton
                testID="action-archive"
                icon="archive"
                label="Archive"
                color={colors.mutedForeground}
                onPress={() => setStatus('archived')}
              />
            ) : (
              <ActionButton
                testID="action-unarchive"
                icon="inbox"
                label="Restore"
                color={colors.primary}
                onPress={() => setStatus('open')}
              />
            )}
            <ActionButton
              testID="action-edit"
              icon="edit-2"
              label="Edit"
              color={colors.foreground}
              onPress={() => {
                setTitle(node.title);
                setDetail(node.detail);
                setEditing(true);
              }}
            />
            <ActionButton
              testID="action-delete"
              icon="trash-2"
              label="Delete"
              color={colors.destructive}
              onPress={confirmDelete}
            />
          </View>
        ) : null}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  color,
  onPress,
  testID,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
  testID?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Feather name={icon} size={18} color={color} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10 },
  missingText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 16 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kindPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  kindDot: { width: 8, height: 8, borderRadius: 4 },
  kindText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  statusText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold', lineHeight: 30 },
  detail: { fontSize: 15, fontFamily: 'Inter_400Regular', lineHeight: 22 },
  timestamp: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  actions: { gap: 10, marginTop: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  actionLabel: { fontSize: 15, fontFamily: 'Inter_500Medium' },
  editBlock: { gap: 12 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
    fontFamily: 'Inter_400Regular',
  },
  editActions: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 13,
  },
  secondaryBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  primaryBtn: { flex: 1, alignItems: 'center', paddingVertical: 13 },
  primaryBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
