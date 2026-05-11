import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "@/errors/AppError.js";

export const permit = (...roles: string[]) => {
  return (req: Request, _: Response, next: NextFunction) => {
    const user = req.user;

    if (!roles.includes(user?.role))
      throw new UnauthorizedError(
        "You are not permitted to access this route.",
      );

    next();
  };
};
