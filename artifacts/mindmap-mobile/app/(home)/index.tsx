import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/expo';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColors } from '@/hooks/useColors';
import { useNodes } from '@/lib/NodesContext';
import { KIND_META, KIND_ORDER, MindNode, NodeKind, NodeStatus } from '@/lib/types';
import { EntryCard } from '@/components/EntryCard';
import { StarField } from '@/components/StarField';

type StatusFilter = 'open' | 'handled' | 'archived' | 'all';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'handled', label: 'Handled' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
];

export default function ListScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { nodes, loading, syncStatus } = useNodes();
  const { signOut } = useAuth();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [kindFilter, setKindFilter] = useState<NodeKind | null>(null);

  const topInset = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const bottomInset = Platform.OS === 'web' ? Math.max(insets.bottom, 34) : insets.bottom;

  const filtered = useMemo(() => {
    let list = nodes;
    if (statusFilter !== 'all') {
      list = list.filter((n) => n.status === (statusFilter as NodeStatus));
    }
    if (kindFilter) list = list.filter((n) => n.kind === kindFilter);
    return [...list].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [nodes, statusFilter, kindFilter]);

  const openCount = useMemo(
    () => nodes.filter((n) => n.status === 'open').length,
    [nodes],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <StarField />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              Quiet Mindmap
            </Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {openCount === 0
                ? 'All clear'
                : `${openCount} open ${openCount === 1 ? 'entry' : 'entries'}`}
              {syncStatus === 'syncing' && '  ·  Syncing…'}
              {syncStatus === 'offline' && '  ·  Offline'}
              {syncStatus === 'error' && '  ·  Sync error'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable
              testID="sign-out"
              onPress={() => void signOut()}
              hitSlop={8}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Feather name="log-out" size={18} color={colors.mutedForeground} />
            </Pressable>
            <View style={[styles.orb, { borderColor: colors.primary }]}>
              <View style={[styles.orbCore, { backgroundColor: colors.primary }]} />
            </View>
          </View>
        </View>

        {/* Status filter */}
        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.value;
            return (
              <Pressable
                key={f.value}
                testID={`status-filter-${f.value}`}
                onPress={() => setStatusFilter(f.value)}
                style={({ pressed }) => [
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.accent : 'transparent',
                    borderColor: active ? colors.primary : colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? colors.foreground : colors.mutedForeground },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Kind filter */}
        <View style={styles.filterRow}>
          {KIND_ORDER.map((kind) => {
            const meta = KIND_META[kind];
            const active = kindFilter === kind;
            return (
              <Pressable
                key={kind}
                testID={`kind-filter-${kind}`}
                onPress={() => setKindFilter(active ? null : kind)}
                style={({ pressed }) => [
                  styles.filterChip,
                  styles.kindChip,
                  {
                    backgroundColor: active ? meta.bg : 'transparent',
                    borderColor: active ? meta.border : colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <View style={[styles.kindDot, { backgroundColor: meta.color }]} />
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? meta.color : colors.mutedForeground },
                  ]}
                >
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: MindNode) => item.id}
          scrollEnabled={filtered.length > 0}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: bottomInset + 96 },
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <EntryCard
              node={item}
              onPress={() => router.push({ pathname: '/entry/[id]', params: { id: item.id } })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="moon" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Nothing here
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {statusFilter === 'open'
                  ? 'Tap + to capture a thought before it drifts away.'
                  : 'No entries match this filter.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Quick capture FAB */}
      <Pressable
        testID="capture-fab"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push('/capture');
        }}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: bottomInset + 24,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
      >
        <Feather name="plus" size={28} color={colors.primaryForeground} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  headerSub: { fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 2 },
  orb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbCore: { width: 14, height: 14, borderRadius: 7 },
  filterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  kindChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kindDot: { width: 7, height: 7, borderRadius: 4 },
  filterText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  emptyText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#a78bfa',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
