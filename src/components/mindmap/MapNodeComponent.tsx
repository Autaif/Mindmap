import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { MapNode, NodeKind } from '@/types';
import { cn } from '@/lib/utils';
import { Check, Orbit, Zap, Flag, Compass } from 'lucide-react';

interface Props {
  node: MapNode;
  onUpdate: (id: string, updates: Partial<MapNode>) => void;
  onSelect: (id: string) => void;
  isSelected: boolean;
}

const kindConfig: Record<NodeKind, { icon: React.ElementType, styles: string, glow: string }> = {
  concern: { icon: Flag, styles: 'border-[hsl(var(--node-concern))] bg-[hsl(var(--node-concern))/0.15] text-[hsl(var(--node-concern))]', glow: 'shadow-[0_0_20px_hsl(var(--node-concern))/0.2]' },
  idea: { icon: Orbit, styles: 'border-[hsl(var(--node-idea))] bg-[hsl(var(--node-idea))/0.15] text-[hsl(var(--node-idea))]', glow: 'shadow-[0_0_20px_hsl(var(--node-idea))/0.2]' },
  urgent: { icon: Zap, styles: 'border-[hsl(var(--node-urgent))] bg-[hsl(var(--node-urgent))/0.15] text-[hsl(var(--node-urgent))]', glow: 'shadow-[0_0_20px_hsl(var(--node-urgent))/0.3]' },
  task: { icon: Compass, styles: 'border-[hsl(var(--node-task))] bg-[hsl(var(--node-task))/0.15] text-[hsl(var(--node-task))]', glow: 'shadow-[0_0_20px_hsl(var(--node-task))/0.2]' }
};

export const MapNodeComponent = memo(({ node, onUpdate, onSelect, isSelected }: Props) => {
  const isArchived = node.status === 'archived';
  const isHandled = node.status === 'handled';
  const config = kindConfig[node.kind];
  const Icon = config.icon;

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragStart={() => onSelect(node.id)}
      onDragEnd={(e, info) => {
        if (info.offset.x === 0 && info.offset.y === 0) return;
        onUpdate(node.id, { position: { x: node.position.x + info.offset.x, y: node.position.y + info.offset.y } });
      }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: isArchived ? 0.3 : isHandled ? 0.6 : 1 }}
      className={cn(
        "absolute rounded-full border border-solid backdrop-blur-md cursor-grab active:cursor-grabbing flex items-center gap-3 pr-5 pl-3 py-2.5 transition-colors duration-200",
        config.styles,
        (!isArchived && !isHandled) && config.glow,
        isSelected && "ring-2 ring-offset-4 ring-offset-background ring-current z-50",
        !isSelected && "z-10 hover:z-20"
      )}
      style={{ x: node.position.x, y: node.position.y, touchAction: 'none', position: 'absolute', top: 0, left: 0 }}
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node.id);
      }}
    >
      <div className="shrink-0 flex items-center justify-center p-1.5 rounded-full bg-current text-background">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex flex-col">
        <span className="font-semibold text-sm whitespace-nowrap tracking-tight leading-tight">{node.title}</span>
        {node.owner && <span className="text-[10px] opacity-80 uppercase tracking-wider font-bold mt-0.5">{node.owner}</span>}
      </div>
      
      {isHandled && (
         <div className="absolute -top-1.5 -right-1.5 bg-background rounded-full border p-1 text-current">
           <Check className="w-3.5 h-3.5" />
         </div>
      )}
    </motion.div>
  );
});
MapNodeComponent.displayName = "MapNodeComponent";
