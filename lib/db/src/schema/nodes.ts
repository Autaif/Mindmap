import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Mindmap nodes. `id` is client-generated so entries created offline keep a
 * stable identity when they sync. `updatedAt` is client-supplied and drives
 * last-write-wins conflict resolution across devices.
 */
export const nodesTable = pgTable(
  "nodes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull(),
    detail: text("detail").notNull().default(""),
    kind: text("kind").notNull(),
    owner: text("owner").notNull().default(""),
    status: text("status").notNull().default("open"),
    parentId: text("parent_id"),
    x: integer("x").notNull(),
    y: integer("y").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("nodes_user_id_idx").on(t.userId)],
);

export const insertNodeSchema = createInsertSchema(nodesTable);
export type InsertNode = z.infer<typeof insertNodeSchema>;
export type NodeRow = typeof nodesTable.$inferSelect;
