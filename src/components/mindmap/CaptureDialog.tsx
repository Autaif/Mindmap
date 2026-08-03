import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { NodeKind } from '@/types';
import { Flag, Orbit, Zap, Compass } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: { title: string; detail: string; kind: NodeKind; owner: string }) => void;
}

export function CaptureDialog({ open, onOpenChange, onAdd }: Props) {
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [kind, setKind] = useState<NodeKind>('idea');
  const [owner, setOwner] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    onAdd({ title, detail, kind, owner });
    setTitle('');
    setDetail('');
    setKind('idea');
    setOwner('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Capture New Entry</DialogTitle>
            <DialogDescription>
              Add a thought, concern, or task to the mindmap.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's on your mind?"
                autoFocus
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="detail">Private Detail (Optional)</Label>
              <Textarea
                id="detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Additional context or thoughts..."
                className="resize-none"
                rows={3}
              />
            </div>
            
            <div className="grid gap-3">
              <Label>Type</Label>
              <RadioGroup value={kind} onValueChange={(v) => setKind(v as NodeKind)} className="grid grid-cols-2 gap-2">
                <Label htmlFor="kind-idea" className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary ${kind === 'idea' ? 'border-[hsl(var(--node-idea))] text-[hsl(var(--node-idea))]' : ''}`}>
                  <RadioGroupItem value="idea" id="kind-idea" className="sr-only" />
                  <Orbit className="mb-2 h-6 w-6" />
                  Idea
                </Label>
                <Label htmlFor="kind-concern" className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary ${kind === 'concern' ? 'border-[hsl(var(--node-concern))] text-[hsl(var(--node-concern))]' : ''}`}>
                  <RadioGroupItem value="concern" id="kind-concern" className="sr-only" />
                  <Flag className="mb-2 h-6 w-6" />
                  Concern
                </Label>
                <Label htmlFor="kind-urgent" className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary ${kind === 'urgent' ? 'border-[hsl(var(--node-urgent))] text-[hsl(var(--node-urgent))]' : ''}`}>
                  <RadioGroupItem value="urgent" id="kind-urgent" className="sr-only" />
                  <Zap className="mb-2 h-6 w-6" />
                  Urgent
                </Label>
                <Label htmlFor="kind-task" className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary ${kind === 'task' ? 'border-[hsl(var(--node-task))] text-[hsl(var(--node-task))]' : ''}`}>
                  <RadioGroupItem value="task" id="kind-task" className="sr-only" />
                  <Compass className="mb-2 h-6 w-6" />
                  Task
                </Label>
              </RadioGroup>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="owner">Person / Team (Optional)</Label>
              <Input
                id="owner"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="e.g. Engineering, Sarah"
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!title.trim()}>Add to Map</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
