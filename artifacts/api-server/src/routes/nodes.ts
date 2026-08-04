import { Router, type IRouter } from "express";
import { eq, and, inArray, sql } from "drizzle-orm";
import { db, nodesTable, type NodeRow } from "@workspace/db";
import { ListNodesResponse, SyncNodesBody, SyncNodesResponse } from "@workspace/api-zod";
import { requireAuth, authedUserId } from "../middlewares/requireAuth";

const router: IRouter = Router();

function toApi(row: NodeRow) {
  return {
    id: row.id,
    title: row.title,
    detail: row.detail,
    kind: row.kind,
    owner: row.owner,
    status: row.status,
    parentId: row.parentId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    x: row.x,
    y: row.y,
  };
}

async function listForUser(userId: string) {
  return db.select().from(nodesTable).where(eq(nodesTable.userId, userId));
}

router.get("/nodes", requireAuth, async (_req, res) => {
  const rows = await listForUser(authedUserId(res));
  res.json(ListNodesResponse.parse(rows.map(toApi)));
});

router.post("/nodes/sync", requireAuth, async (req, res) => {
  const parsed = SyncNodesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = authedUserId(res);
  const { upserts, deletes } = parsed.data;

  for (const n of upserts) {
    const createdAt = new Date(n.createdAt);
    const updatedAt = new Date(n.updatedAt);
    if (Number.isNaN(createdAt.getTime()) || Number.isNaN(updatedAt.getTime())) {
      res.status(400).json({ error: `Invalid timestamp on node ${n.id}` });
      return;
    }
    await db
      .insert(nodesTable)
      .values({
        id: n.id,
        userId,
        title: n.title,
        detail: n.detail,
        kind: n.kind,
        owner: n.owner,
        status: n.status,
        parentId: n.parentId,
        x: Math.round(n.x),
        y: Math.round(n.y),
        createdAt,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: nodesTable.id,
        set: {
          title: n.title,
          detail: n.detail,
          kind: n.kind,
          owner: n.owner,
          status: n.status,
          parentId: n.parentId,
          x: Math.round(n.x),
          y: Math.round(n.y),
          updatedAt,
        },
        // Last-write-wins: only apply if this edit is newer, and never touch
        // another user's row even on an id collision.
        setWhere: and(
          eq(nodesTable.userId, userId),
          sql`${nodesTable.updatedAt} <= ${updatedAt}`,
        ),
      });
  }

  if (deletes.length > 0) {
    await db
      .delete(nodesTable)
      .where(and(eq(nodesTable.userId, userId), inArray(nodesTable.id, deletes)));
  }

  const rows = await listForUser(userId);
  res.json(SyncNodesResponse.parse(rows.map(toApi)));
});

export default router;
