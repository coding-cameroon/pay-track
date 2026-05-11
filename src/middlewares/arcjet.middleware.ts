import { isSpoofedBot } from "@arcjet/inspect";
import { Request, Response, NextFunction } from "express";

import { arcjet } from "@/config/arcjet.js";

import { ForbiddenError, TooManyRequestError } from "@/errors/AppError.js";

export const arcjetMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const decision = await arcjet.protect(req, { requested: 1 });
    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) throw new TooManyRequestError();
      if (decision.reason.isBot())
        throw new ForbiddenError("Bots are not allowed");

      throw new ForbiddenError("Forbidden");
    }

    if (decision.ip.isHosting()) throw new ForbiddenError("Forbidden");

    if (decision.results.some(isSpoofedBot))
      throw new ForbiddenError("Forbidden");

    next();
  } catch (error) {
    next(error);
  }
};
