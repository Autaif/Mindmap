import { useMemo } from 'react';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  dur: number;
  delay: number;
  minOpacity: number;
  maxOpacity: number;
}

function generateStars(count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() < 0.85 ? 1 : Math.random() < 0.5 ? 1.5 : 2,
      dur: 2.5 + Math.random() * 4,
      delay: Math.random() * 5,
      minOpacity: 0.1 + Math.random() * 0.15,
      maxOpacity: 0.4 + Math.random() * 0.5,
    });
  }
  return stars;
}

export function StarField() {
  const stars = useMemo(() => generateStars(140), []);

  return (
    <div className="star-field">
      {stars.map(s => (
        <div
          key={s.id}
          className="star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            '--dur': `${s.dur}s`,
            '--delay': `${s.delay}s`,
            '--min-opacity': s.minOpacity,
            '--max-opacity': s.maxOpacity,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
