import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// --- Mocks -----------------------------------------------------------------

// In-memory stand-in for the nodes table, keyed by id.
type Row = {
  id: string;
  userId: string;
  title: string;
  detail: string;
  kind: string;
  owner: string;
  status: string;
  parentId: string | null;
  x: number;
  y: number;
  createdAt: Date;
  updatedAt: Date;
};

const store = new Map<string, Row>();

// Sentinel used by the fake db to filter/inspect rows without parsing SQL.
let currentUserId = "user_1";

vi.mock("@workspace/db", () => {
  const nodesTable = { id: {}, userId: {}, updatedAt: {} };
  const db = {
    select: () => ({
      from: () => ({
        where: async () =>
          [...store.values()].filter((r) => r.userId === currentUserId),
      }),
    }),
    insert: () => ({
      values: (v: Row) => ({
        onConflictDoUpdate: async ({ set }: { set: Partial<Row> }) => {
          const existing = store.get(v.id);
          if (!existing) {
            store.set(v.id, { ...v });
            return;
          }
          // Emulate the route's last-write-wins setWhere guard:
          // only apply when same user and existing.updatedAt <= new updatedAt.
          const newUpdatedAt = set.updatedAt as Date;
          if (
            existing.userId === v.userId &&
            existing.updatedAt.getTime() <= newUpdatedAt.getTime()
          ) {
            store.set(v.id, { ...existing, ...set });
          }
        },
      }),
    }),
    delete: () => ({
      where: async () => {
        for (const id of pendingDeleteIds) {
          const row = store.get(id);
          if (row && row.userId === currentUserId) store.delete(id);
        }
        pendingDeleteIds = [];
      },
    }),
  };
  return { db, nodesTable };
});

let pendingDeleteIds: string[] = [];

// drizzle operators: capture the ids passed to inArray for the delete mock.
vi.mock("drizzle-orm", () => ({
  eq: () => ({}),
  and: () => ({}),
  sql: () => ({}),
  inArray: (_col: unknown, ids: string[]) => {
    pendingDeleteIds = ids;
    return {};
  },
}));

// Clerk: controllable auth state, pass-through middleware.
let mockUserId: string | null = null;
vi.mock("@clerk/express", () => ({
  clerkMiddleware:
    () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuth: () => ({ userId: mockUserId }),
}));
vi.mock("@clerk/shared/keys", () => ({
  publishableKeyFromHost: () => "pk_test_mock",
}));

// Keep test output quiet.
vi.mock("pino-http", () => ({
  default: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import app from "../app";

// --- Helpers ----------------------------------------------------------------

function makeNode(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "n1",
    title: "Test node",
    detail: "",
    kind: "idea",
    owner: "",
    status: "open",
    parentId: null,
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    x: 10,
    y: 20,
    ...overrides,
  };
}

beforeEach(() => {
  store.clear();
  pendingDeleteIds = [];
  mockUserId = "user_1";
  currentUserId = "user_1";
});

// --- Tests --------------------------------------------------------------------

describe("GET /api/healthz", () => {
  it("returns ok", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("auth", () => {
  it("rejects unauthenticated GET /api/nodes with 401", async () => {
    mockUserId = null;
    const res = await request(app).get("/api/nodes");
    expect(res.status).toBe(401);
  });

  it("rejects unauthenticated POST /api/nodes/sync with 401", async () => {
    mockUserId = null;
    const res = await request(app)
      .post("/api/nodes/sync")
      .send({ upserts: [], deletes: [] });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/nodes", () => {
  it("returns the user's nodes in API shape", async () => {
    store.set("n1", {
      id: "n1",
      userId: "user_1",
      title: "Hello",
      detail: "",
      kind: "task",
      owner: "",
      status: "open",
      parentId: null,
      x: 1,
      y: 2,
      createdAt: new Date("2026-08-01T10:00:00Z"),
      updatedAt: new Date("2026-08-01T10:00:00Z"),
    });

    const res = await request(app).get("/api/nodes");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: "n1",
      title: "Hello",
      kind: "task",
      createdAt: "2026-08-01T10:00:00.000Z",
    });
  });
});

describe("POST /api/nodes/sync", () => {
  it("rejects malformed bodies with 400", async () => {
    const res = await request(app)
      .post("/api/nodes/sync")
      .send({ upserts: [{ id: "x" }], deletes: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("rejects invalid timestamps with 400", async () => {
    const res = await request(app)
      .post("/api/nodes/sync")
      .send({ upserts: [makeNode({ updatedAt: "not-a-date" })], deletes: [] });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Invalid timestamp");
  });

  it("inserts new nodes and returns the merged list", async () => {
    const res = await request(app)
      .post("/api/nodes/sync")
      .send({ upserts: [makeNode({ x: 10.6, y: 19.2 })], deletes: [] });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    // Coordinates are rounded server-side
    expect(res.body[0]).toMatchObject({ id: "n1", x: 11, y: 19 });
  });

  it("applies last-write-wins: stale updates do not overwrite newer rows", async () => {
    store.set("n1", {
      id: "n1",
      userId: "user_1",
      title: "Newer title",
      detail: "",
      kind: "idea",
      owner: "",
      status: "open",
      parentId: null,
      x: 0,
      y: 0,
      createdAt: new Date("2026-08-01T10:00:00Z"),
      updatedAt: new Date("2026-08-02T10:00:00Z"),
    });

    const res = await request(app)
      .post("/api/nodes/sync")
      .send({
        upserts: [
          makeNode({ title: "Stale title", updatedAt: "2026-08-01T09:00:00.000Z" }),
        ],
        deletes: [],
      });
    expect(res.status).toBe(200);
    expect(res.body[0].title).toBe("Newer title");
  });

  it("applies newer updates over older rows", async () => {
    store.set("n1", {
      id: "n1",
      userId: "user_1",
      title: "Old title",
      detail: "",
      kind: "idea",
      owner: "",
      status: "open",
      parentId: null,
      x: 0,
      y: 0,
      createdAt: new Date("2026-08-01T10:00:00Z"),
      updatedAt: new Date("2026-08-01T10:00:00Z"),
    });

    const res = await request(app)
      .post("/api/nodes/sync")
      .send({
        upserts: [
          makeNode({ title: "New title", updatedAt: "2026-08-03T10:00:00.000Z" }),
        ],
        deletes: [],
      });
    expect(res.status).toBe(200);
    expect(res.body[0].title).toBe("New title");
  });

  it("deletes requested nodes but never another user's rows", async () => {
    store.set("mine", {
      id: "mine",
      userId: "user_1",
      title: "Mine",
      detail: "",
      kind: "idea",
      owner: "",
      status: "open",
      parentId: null,
      x: 0,
      y: 0,
      createdAt: new Date("2026-08-01T10:00:00Z"),
      updatedAt: new Date("2026-08-01T10:00:00Z"),
    });
    store.set("theirs", {
      id: "theirs",
      userId: "user_2",
      title: "Theirs",
      detail: "",
      kind: "idea",
      owner: "",
      status: "open",
      parentId: null,
      x: 0,
      y: 0,
      createdAt: new Date("2026-08-01T10:00:00Z"),
      updatedAt: new Date("2026-08-01T10:00:00Z"),
    });

    const res = await request(app)
      .post("/api/nodes/sync")
      .send({ upserts: [], deletes: ["mine", "theirs"] });
    expect(res.status).toBe(200);
    expect(store.has("mine")).toBe(false);
    expect(store.has("theirs")).toBe(true);
  });
});
