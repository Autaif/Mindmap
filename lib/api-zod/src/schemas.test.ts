import { describe, it, expect } from "vitest";
import {
  HealthCheckResponse,
  ListNodesResponse,
  SyncNodesBody,
} from "./index";

const validNode = {
  id: "n1",
  title: "A node",
  detail: "",
  kind: "idea",
  owner: "",
  status: "open",
  parentId: null,
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-01T10:00:00.000Z",
  x: 1,
  y: 2,
};

describe("HealthCheckResponse", () => {
  it("accepts a status string", () => {
    expect(HealthCheckResponse.parse({ status: "ok" })).toEqual({ status: "ok" });
  });
});

describe("ListNodesResponse", () => {
  it("accepts a list of valid nodes", () => {
    expect(ListNodesResponse.parse([validNode])).toHaveLength(1);
  });

  it("rejects an unknown kind", () => {
    const bad = [{ ...validNode, kind: "banana" }];
    expect(() => ListNodesResponse.parse(bad)).toThrow();
  });

  it("rejects an unknown status", () => {
    const bad = [{ ...validNode, status: "done" }];
    expect(() => ListNodesResponse.parse(bad)).toThrow();
  });
});

describe("SyncNodesBody", () => {
  it("accepts a valid sync payload", () => {
    const parsed = SyncNodesBody.parse({
      upserts: [validNode],
      deletes: ["n2"],
    });
    expect(parsed.upserts).toHaveLength(1);
    expect(parsed.deletes).toEqual(["n2"]);
  });

  it("requires both upserts and deletes", () => {
    expect(() => SyncNodesBody.parse({ upserts: [] })).toThrow();
    expect(() => SyncNodesBody.parse({ deletes: [] })).toThrow();
  });

  it("rejects nodes missing required fields", () => {
    const { title: _title, ...missingTitle } = validNode;
    expect(() =>
      SyncNodesBody.parse({ upserts: [missingTitle], deletes: [] }),
    ).toThrow();
  });

  it("allows nullable parentId but not missing", () => {
    expect(() =>
      SyncNodesBody.parse({
        upserts: [{ ...validNode, parentId: undefined }],
        deletes: [],
      }),
    ).toThrow();
  });
});
