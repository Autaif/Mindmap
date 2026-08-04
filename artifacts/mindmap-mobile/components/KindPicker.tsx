import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { KIND_META, KIND_ORDER, NodeKind } from '@/lib/types';
import { useColors } from '@/hooks/useColors';

export function KindPicker({
  value,
  onChange,
}: {
  value: NodeKind;
  onChange: (kind: NodeKind) => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      {KIND_ORDER.map((kind) => {
        const meta = KIND_META[kind];
        const selected = kind === value;
        return (
          <Pressable
            key={kind}
            testID={`kind-${kind}`}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(kind);
            }}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: selected ? meta.bg : colors.secondary,
                borderColor: selected ? meta.border : colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: meta.color }]} />
            <Text
              style={[
                styles.label,
                { color: selected ? meta.color : colors.mutedForeground },
              ]}
            >
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 13, fontFamily: 'Inter_500Medium' },
});
