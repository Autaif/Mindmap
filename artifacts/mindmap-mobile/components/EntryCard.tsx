import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { KIND_META, MindNode } from '@/lib/types';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

export function EntryCard({
  node,
  onPress,
}: {
  node: MindNode;
  onPress: () => void;
}) {
  const colors = useColors();
  const meta = KIND_META[node.kind];
  const dimmed = node.status !== 'open';

  return (
    <Pressable
      testID={`entry-card-${node.id}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius,
          opacity: pressed ? 0.75 : dimmed ? 0.55 : 1,
        },
      ]}
    >
      <View style={[styles.kindDot, { backgroundColor: meta.color }]} />
      <View style={styles.body}>
        <Text
          style={[
            styles.title,
            { color: colors.foreground },
            node.status === 'handled' && styles.struck,
          ]}
          numberOfLines={2}
        >
          {node.title}
        </Text>
        {node.detail ? (
          <Text style={[styles.detail, { color: colors.mutedForeground }]} numberOfLines={1}>
            {node.detail}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <View
            style={[
              styles.kindPill,
              { backgroundColor: meta.bg, borderColor: meta.border },
            ]}
          >
            <Text style={[styles.kindPillText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          {node.status !== 'open' ? (
            <View style={styles.statusRow}>
              <Feather
                name={node.status === 'handled' ? 'check-circle' : 'archive'}
                size={12}
                color={colors.mutedForeground}
              />
              <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
                {node.status === 'handled' ? 'Handled' : 'Archived'}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.time, { color: colors.mutedForeground }]}>
            {timeAgo(node.updatedAt)}
          </Text>
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  kindDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  body: { flex: 1, gap: 4 },
  title: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 20,
  },
  struck: { textDecorationLine: 'line-through' },
  detail: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  kindPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  kindPillText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  time: {
    marginLeft: 'auto',
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
});
