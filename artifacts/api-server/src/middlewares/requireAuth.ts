import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.locals.userId = userId;
  next();
}

/** Read the user id set by `requireAuth`. Only call on routes behind it. */
export function authedUserId(res: Response): string {
  const userId = res.locals.userId;
  if (typeof userId !== "string") {
    throw new Error("authedUserId called on a route without requireAuth");
  }
  return userId;
}
