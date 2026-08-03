import React, { useRef, useState, useEffect } from 'react';
import { MapNodeComponent } from './MapNodeComponent';
import { MapNode } from '@/types';

interface Props {
  nodes: MapNode[];
  onUpdateNode: (id: string, updates: Partial<MapNode>) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function Canvas({ nodes, onUpdateNode, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    // Center the viewport on the middle of the 4000x4000 canvas
    if (containerRef.current) {
      containerRef.current.scrollTo(2000 - window.innerWidth / 2, 2000 - window.innerHeight / 2);
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).id === 'canvas-bg') {
      setIsPanning(true);
      containerRef.current?.setPointerCapture(e.pointerId);
      onSelect(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning || !containerRef.current) return;
    containerRef.current.scrollBy(-e.movementX, -e.movementY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsPanning(false);
    containerRef.current?.releasePointerCapture(e.pointerId);
  };

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full overflow-auto bg-background touch-none select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div id="canvas-bg" className="w-[4000px] h-[4000px] relative overflow-hidden">
        {/* Constellation / Grid background */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.15]" 
          style={{ 
            backgroundImage: 'radial-gradient(circle at center, currentColor 1px, transparent 1px)', 
            backgroundSize: '40px 40px' 
          }} 
        />
        
        {nodes.map(node => (
          <MapNodeComponent
            key={node.id}
            node={node}
            onUpdate={onUpdateNode}
            isSelected={selectedId === node.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
