export type NodeKind = 'concern' | 'idea' | 'urgent' | 'task';
export type NodeStatus = 'open' | 'handled' | 'archived';

export interface MapNode {
  id: string;
  title: string;
  detail?: string;
  kind: NodeKind;
  owner?: string;
  status: NodeStatus;
  createdAt: string;
  updatedAt: string;
  position: { x: number; y: number };
}

export const SEED_DATA: MapNode[] = [
  {
    id: "seed-1",
    title: "Morale in Engineering",
    detail: "Several folks mentioned feeling burned out after the last release. Need to figure out a better rotation.",
    kind: "concern",
    status: "open",
    position: { x: 2000, y: 1850 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "seed-2",
    title: "Server Migration",
    detail: "Move the legacy DB before end of quarter.",
    kind: "task",
    status: "open",
    position: { x: 2300, y: 2000 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "seed-3",
    title: "Client X Data Loss",
    detail: "Investigating the missing records from Tuesday's backup.",
    kind: "urgent",
    status: "open",
    position: { x: 2150, y: 1700 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "seed-4",
    title: "Weekly 'Quiet Hours'",
    detail: "What if we had no-meeting Wednesdays across the whole org?",
    kind: "idea",
    status: "open",
    position: { x: 1750, y: 2100 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
