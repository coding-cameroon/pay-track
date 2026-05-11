import { NODE_ENV } from "@/config/env";
import { AppError } from "@/errors/AppError";
import type { Request, Response, NextFunction } from "express";

export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      statusCode: err.statusCode,
      success: err.success || false,
    });
  }

  if (err.message?.includes("duplicate key")) {
    return res.status(409).json({
      success: false,
      message: "Resource already exists",
    });
  }

  if (err.message?.includes("foreign key")) {
    return res.status(400).json({
      success: false,
      message: "Referenced resource does not exist",
    });
  }

  if (
    // err?.cause?.code === "23505" ||
    err?.message?.includes("duplicate key") ||
    err?.message?.includes("already exists")
  ) {
    return res.status(409).json({
      success: false,
      error: err?.message,
      message: "Resource already exists",
    });
  }

  console.error("Unhandled error:", err);

  return res.status(500).json({
    error: err,
    success: false,
    message: "Something went wrong. Please try again.",
    ...(NODE_ENV === "development" && { stack: err.stack, error: err }),
  });
}
