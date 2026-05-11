import { getAuth } from "@clerk/express";
import type { NextFunction, Request, Response } from "express";

import { userService } from "@/modules/users/user.service";
import { NotFoundError, UnauthorizedError } from "@/errors/AppError";

export const requireAuth = async (
  req: Request,
  _: Response,
  next: NextFunction,
) => {
  try {
    const { userId, isAuthenticated } = getAuth(req);

    if (!isAuthenticated) throw new UnauthorizedError("Not authenticated");

    const user = await userService.getUserByClerkId(userId);
    if (!user) throw new NotFoundError("User account doesn't exist");

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
