import type { Response } from "express";

export function successResponse(
  res: Response,
  statusCode = 200,
  data: any,
  message: string,
) {
  return res.status(statusCode).json({ message, success: true, data });
}

export function errorResponse(
  res: Response,
  message: string,
  statusCode = 500,
) {
  return res.status(statusCode).json({ message, success: false });
}
