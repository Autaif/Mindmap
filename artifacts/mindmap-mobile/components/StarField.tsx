import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

/**
 * Lightweight static star field backdrop matching the web app's
 * space canvas. Pure Views — no SVG or animation cost.
 */
export function StarField({ count = 70 }: { count?: number }) {
  const { width, height } = useWindowDimensions();
  const stars = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        // Deterministic pseudo-random per index so re-renders don't reshuffle.
        const seed = Math.sin(i * 999.7) * 10000;
        const r1 = seed - Math.floor(seed);
        const seed2 = Math.sin(i * 173.3) * 10000;
        const r2 = seed2 - Math.floor(seed2);
        const seed3 = Math.sin(i * 51.1) * 10000;
        const r3 = seed3 - Math.floor(seed3);
        return {
          left: r1 * width,
          top: r2 * height,
          size: 1 + r3 * 2,
          opacity: 0.15 + r3 * 0.5,
        };
      }),
    [count, width, height],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {stars.map((s, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: '#e2e8f0',
            opacity: s.opacity,
          }}
        />
      ))}
    </View>
  );
}
