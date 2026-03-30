import type { NextFunction, Request, Response } from "express";

export function errorHandler(error: Error, _: Request, res: Response, __: NextFunction) {
  res.status(500).json({
    message: error.message || "Unexpected server error"
  });
}

