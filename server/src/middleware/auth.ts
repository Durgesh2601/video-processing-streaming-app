import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { User, type Role } from "../models/User.js";

type TokenPayload = {
  sub: string;
  organizationId: string;
  role: Role;
};

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const queryToken = typeof req.query.token === "string" ? req.query.token : undefined;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : queryToken;

  if (!token) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret) as TokenPayload;
    const user = await User.findById(payload.sub);

    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

export function requireRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;

    if (!role || !roles.includes(role)) {
      res.status(403).json({ message: "Insufficient permission" });
      return;
    }

    next();
  };
}

export function createToken(userId: string, organizationId: string, role: Role) {
  return jwt.sign({ sub: userId, organizationId, role }, config.jwtSecret, { expiresIn: "7d" });
}
