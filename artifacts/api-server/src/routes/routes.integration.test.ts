import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";
import request from "supertest";
import type { Express } from "express";
import type { pool as PoolType } from "@workspace/db";

/**
 * Integration tests for POST /api/nodes/sync against a REAL Postgres
 * connection. The mocked-db tests in routes.test.ts emulate the
 * last-write-wins `setWhere` guard; these tests execute the actual drizzle
 * upsert SQL to prove the guard works in Postgres itself.
 *
 * Isolation: all queries run inside a dedicated throwaway schema
 * (`nodes_sync_it`) selected via the connection's search_path, so dev data in
 * `public` is never touched. The schema is dropped after the run.
 *
 * Skipped gracefully when no database is configured (no DATABASE_URL).
 */

const hasDb = Boolean(process.env.DATABASE_URL);

const TEST_SCHEMA = "nodes_sync_it";

// Clerk: controllable auth state, pass-through middleware (same as routes.test.ts).
let mockUserId: string | null = "user_a";
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

describe.skipIf(!hasDb)("POST /api/nodes/sync (real Postgres)", () => {
  let app: Express;
  let pool: typeof PoolType;

  beforeAll(async () => {
    // Point the app's db connection at the throwaway schema BEFORE
    // @workspace/db is imported (it reads DATABASE_URL at import time).
    const url = new URL(process.env.DATABASE_URL as string);
    url.searchParams.set("options", `-c search_path=${TEST_SCHEMA}`);
    process.env.DATABASE_URL = url.toString();

    const dbMod = await import("@workspace/db");
    pool = dbMod.pool;

    await pool.query(`CREATE SCHEMA IF NOT EXISTS ${TEST_SCHEMA}`);
    // Mirrors lib/db/src/schema/nodes.ts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${TEST_SCHEMA}.nodes (
        id text PRIMARY KEY,
        user_id text NOT NULL,
        title text NOT NULL,
        detail text NOT NULL DEFAULT '',
        kind text NOT NULL,
        owner text NOT NULL DEFAULT '',
        status text NOT NULL DEFAULT 'open',
        parent_id text,
        x integer NOT NULL,
        y integer NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      )
    `);

    app = (await import("../app")).default;
  }, 30_000);

  afterAll(async () => {
    if (pool) {
      await pool.query(`DROP SCHEMA IF EXISTS ${TEST_SCHEMA} CASCADE`);
      await pool.end();
    }
  });

  beforeEach(async () => {
    mockUserId = "user_a";
    await pool.query(`TRUNCATE ${TEST_SCHEMA}.nodes`);
  });

  async function rowById(id: string) {
    const res = await pool.query(
      `SELECT * FROM ${TEST_SCHEMA}.nodes WHERE id = $1`,
      [id],
    );
    return res.rows[0] as
      | { user_id: string; title: string; updated_at: Date }
      | undefined;
  }

  it("inserts a new node into the real table", async () => {
    const res = await request(app)
      .post("/api/nodes/sync")
      .send({ upserts: [makeNode()], deletes: [] });
    expect(res.status).toBe(200);

    const row = await rowById("n1");
    expect(row).toBeDefined();
    expect(row?.title).toBe("Test node");
    expect(row?.user_id).toBe("user_a");
  });

  it("rejects stale updates: an older offline edit never overwrites a newer row", async () => {
    // Seed a newer row.
    await request(app)
      .post("/api/nodes/sync")
      .send({
        upserts: [
          makeNode({ title: "Newer title", updatedAt: "2026-08-02T10:00:00.000Z" }),
        ],
        deletes: [],
      });

    // Attempt a stale overwrite.
    const res = await request(app)
      .post("/api/nodes/sync")
      .send({
        upserts: [
          makeNode({ title: "Stale title", updatedAt: "2026-08-01T09:00:00.000Z" }),
        ],
        deletes: [],
      });
    expect(res.status).toBe(200);

    const row = await rowById("n1");
    expect(row?.title).toBe("Newer title");
    expect(row?.updated_at.toISOString()).toBe("2026-08-02T10:00:00.000Z");
  });

  it("applies newer updates over older rows", async () => {
    await request(app)
      .post("/api/nodes/sync")
      .send({
        upserts: [makeNode({ title: "Old title" })],
        deletes: [],
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

    const row = await rowById("n1");
    expect(row?.title).toBe("New title");
    expect(row?.updated_at.toISOString()).toBe("2026-08-03T10:00:00.000Z");
  });

  it("never touches another user's row on an id collision, even with a newer timestamp", async () => {
    // user_a owns n1.
    await request(app)
      .post("/api/nodes/sync")
      .send({
        upserts: [makeNode({ title: "Alice's node" })],
        deletes: [],
      });

    // user_b syncs a node with the same id and a NEWER timestamp.
    mockUserId = "user_b";
    const res = await request(app)
      .post("/api/nodes/sync")
      .send({
        upserts: [
          makeNode({ title: "Bob's hijack", updatedAt: "2026-08-05T10:00:00.000Z" }),
        ],
        deletes: [],
      });
    expect(res.status).toBe(200);
    // Bob's response contains none of Alice's data.
    expect(res.body).toEqual([]);

    const row = await rowById("n1");
    expect(row?.user_id).toBe("user_a");
    expect(row?.title).toBe("Alice's node");
    expect(row?.updated_at.toISOString()).toBe("2026-08-01T10:00:00.000Z");
  });

  it("delete requests never remove another user's rows", async () => {
    await request(app)
      .post("/api/nodes/sync")
      .send({ upserts: [makeNode({ id: "mine", title: "Mine" })], deletes: [] });
    mockUserId = "user_b";
    await request(app)
      .post("/api/nodes/sync")
      .send({ upserts: [makeNode({ id: "theirs", title: "Theirs" })], deletes: [] });

    mockUserId = "user_a";
    const res = await request(app)
      .post("/api/nodes/sync")
      .send({ upserts: [], deletes: ["mine", "theirs"] });
    expect(res.status).toBe(200);

    expect(await rowById("mine")).toBeUndefined();
    expect((await rowById("theirs"))?.user_id).toBe("user_b");
  });
});
