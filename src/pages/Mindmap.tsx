import React, { useState, useMemo } from 'react';
import { useMindmap } from '@/hooks/use-mindmap';
import { Canvas } from '@/components/mindmap/Canvas';
import { CaptureDialog } from '@/components/mindmap/CaptureDialog';
import { Search, Plus, Archive, Shield, CheckCircle2, Circle, EyeOff, LayoutGrid, X, Trash2, ArrowUpRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapNode, NodeKind, NodeStatus } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

export default function MindmapPage() {
  const { nodes, addNode, updateNode, removeNode, isFirstLaunch, dismissFirstLaunch } = useMindmap();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<NodeKind | null>(null);
  const [filterStatus, setFilterStatus] = useState<NodeStatus>('open');

  const selectedNode = nodes.find(n => n.id === selectedId);

  const filteredNodes = useMemo(() => {
    return nodes.filter(n => {
      if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.detail?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType && n.kind !== filterType) return false;
      if (n.status !== filterStatus) return false;
      return true;
    });
  }, [nodes, search, filterType, filterStatus]);

  // Center coordinates for new nodes if the canvas hasn't been panned much
  // Ideally, this could be the center of the current viewport, but for simplicity we place them near the center.
  const handleAddNode = (data: any) => {
    // Generate a random offset near the center
    const offsetX = Math.floor(Math.random() * 400) - 200;
    const offsetY = Math.floor(Math.random() * 400) - 200;
    const newNode = addNode({ ...data, position: { x: 2000 + offsetX, y: 2000 + offsetY }, status: 'open' });
    setSelectedId(newNode.id);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground selection:bg-primary/30">
      
      {/* Left Sidebar */}
      <div className="w-80 border-r border-border bg-card flex flex-col z-20 shadow-xl relative">
        <div className="p-6 border-b border-border flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-muted-foreground" />
              Quiet Mindmap
            </h1>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <Shield className="w-3 h-3" /> All data stays on this device.
            </p>
          </div>
          
          <Button onClick={() => setIsCaptureOpen(true)} className="w-full gap-2 shadow-lg hover:shadow-primary/20 transition-all">
            <Plus className="w-4 h-4" /> Capture Thought
          </Button>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input 
              placeholder="Search observatory..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-background/50 border-border"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <LayoutGrid className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filters</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {(['open', 'handled', 'archived'] as NodeStatus[]).map(status => (
              <Badge 
                key={status} 
                variant={filterStatus === status ? "default" : "outline"}
                className={`cursor-pointer capitalize ${filterStatus === status ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setFilterStatus(status)}
              >
                {status}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={`cursor-pointer ${!filterType ? 'border-primary text-primary' : 'text-muted-foreground'}`} onClick={() => setFilterType(null)}>All</Badge>
            {(['concern', 'idea', 'urgent', 'task'] as NodeKind[]).map(type => (
              <Badge 
                key={type}
                variant="outline"
                className={`cursor-pointer capitalize ${filterType === type ? 'border-primary text-primary' : 'text-muted-foreground'}`}
                onClick={() => setFilterType(type)}
              >
                {type}
              </Badge>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="flex flex-col gap-2">
            {filteredNodes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center p-4">No entries found.</p>
            )}
            {filteredNodes.map(node => (
              <button 
                key={node.id}
                onClick={() => setSelectedId(node.id)}
                className={`text-left p-3 rounded-lg border transition-all ${selectedId === node.id ? 'bg-accent border-primary/50' : 'bg-background/50 border-transparent hover:border-border'}`}
              >
                <div className="font-medium text-sm truncate">{node.title}</div>
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm bg-[hsl(var(--node-${node.kind}))]/10 text-[hsl(var(--node-${node.kind}))]`}>
                    {node.kind}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(node.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 relative overflow-hidden bg-background">
        <Canvas 
          nodes={nodes} 
          onUpdateNode={updateNode} 
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        
        {/* First Launch overlay */}
        <AnimatePresence>
          {isFirstLaunch && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur border border-border p-6 rounded-xl shadow-2xl max-w-md text-center z-40"
            >
              <h2 className="text-lg font-bold mb-2">Welcome to Quiet Mindmap</h2>
              <p className="text-sm text-muted-foreground mb-4">
                A private thinking space. Drag nodes around to organize them. 
                Everything is saved securely to your device's local storage.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => {
                  nodes.forEach(n => removeNode(n.id));
                  dismissFirstLaunch();
                }}>Clear Examples</Button>
                <Button onClick={dismissFirstLaunch}>Keep Exploring</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Right Sidebar (Inspector) */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div 
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="w-80 border-l border-border bg-card flex flex-col z-20 shadow-xl absolute right-0 top-0 bottom-0"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Inspector</h2>
              <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={() => setSelectedId(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-6 flex flex-col gap-6">
                <div>
                  <div className={`inline-flex items-center text-xs font-bold uppercase tracking-wider mb-3 px-2 py-1 rounded-md bg-[hsl(var(--node-${selectedNode.kind}))]/10 text-[hsl(var(--node-${selectedNode.kind}))]`}>
                    {selectedNode.kind}
                  </div>
                  <h3 className="text-2xl font-bold leading-tight mb-2">{selectedNode.title}</h3>
                  {selectedNode.owner && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-foreground">
                        {selectedNode.owner.charAt(0).toUpperCase()}
                      </div>
                      {selectedNode.owner}
                    </div>
                  )}
                </div>

                {selectedNode.detail && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Private Detail</h4>
                    <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                      {selectedNode.detail}
                    </p>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</h4>
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant={selectedNode.status === 'open' ? 'secondary' : 'ghost'} 
                      className="justify-start gap-3 w-full"
                      onClick={() => updateNode(selectedNode.id, { status: 'open' })}
                    >
                      <Circle className="w-4 h-4" /> Open
                    </Button>
                    <Button 
                      variant={selectedNode.status === 'handled' ? 'secondary' : 'ghost'} 
                      className="justify-start gap-3 w-full"
                      onClick={() => updateNode(selectedNode.id, { status: 'handled' })}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Handled
                    </Button>
                    <Button 
                      variant={selectedNode.status === 'archived' ? 'secondary' : 'ghost'} 
                      className="justify-start gap-3 w-full"
                      onClick={() => updateNode(selectedNode.id, { status: 'archived' })}
                    >
                      <Archive className="w-4 h-4 text-muted-foreground" /> Archived
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border mt-auto">
              <Button 
                variant="destructive" 
                className="w-full gap-2"
                onClick={() => {
                  removeNode(selectedNode.id);
                  setSelectedId(null);
                }}
              >
                <Trash2 className="w-4 h-4" /> Delete Entry
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CaptureDialog 
        open={isCaptureOpen} 
        onOpenChange={setIsCaptureOpen} 
        onAdd={handleAddNode}
      />
    </div>
  );
}
