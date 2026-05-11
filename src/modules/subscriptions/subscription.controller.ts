import mongoose, { Types } from "mongoose";
import type { NextFunction, Request, Response } from "express";

import { successResponse } from "@/utils/responses";
import { subscriptionService } from "./subscription.service";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/errors/AppError";

class SubscriptionController {
  // ---------------------------------------------------
  // POST /subscriptions — Create a subscription
  // ---------------------------------------------------
  async createSubscription(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const {
        name,
        price,
        currency,
        category,
        frequency,
        startDate,
        isShared,
        sharedWith,
      } = req.body;

      if (!name) throw new BadRequestError("Name is required");
      if (!price) throw new BadRequestError("Price is required");
      if (!category) throw new BadRequestError("Category is required");
      if (!startDate) throw new BadRequestError("Start date is required");
      if (isShared && (!sharedWith || sharedWith.length === 0)) {
        throw new BadRequestError(
          "Shared members are required when is shared is true",
        );
      }
      if (new Date(startDate) >= new Date())
        throw new BadRequestError("Start date must be in the past.");

      const subscription = await subscriptionService.createSubscription(
        {
          name,
          isShared,
          currency,
          category,
          frequency,
          sharedWith,
          price: Number(price),
          ownerId: req.user._id,
          startDate: new Date(startDate),
        },
        session,
      );

      // TODO: Schedule QStash reminders for this subscription
      // await scheduleReminders(subscription, req.user.id);

      await session.commitTransaction();
      successResponse(
        res,
        201,
        subscription,
        "Subscription created successfully",
      );
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  }

  // ---------------------------------------------------
  // GET /subscriptions — Get current user.s subscriptions
  // ---------------------------------------------------
  async getMySubscriptions(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const subscriptions = await subscriptionService.getSubscriptionsByOwnerId(
        req.user._id,
      );

      successResponse(
        res,
        200,
        subscriptions,
        "Subscriptions fetched successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------
  // GET /subscriptions/active — Get current user.s active subscriptions
  // ---------------------------------------------------
  async getMyActiveSubscriptions(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const subscriptions =
        await subscriptionService.getActiveSubscriptionsByOwnerId(req.user._id);

      successResponse(
        res,
        200,
        subscriptions,
        "Active subscriptions fetched successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------
  // GET /subscriptions/all — Admin: get all subscriptions
  // ---------------------------------------------------
  async getAllSubscriptions(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (page < 1) throw new BadRequestError("Page must be greater than 0");
      if (limit < 1) throw new BadRequestError("Limit must be greater than 0");
      if (limit > 100) throw new BadRequestError("Limit cannot exceed 100");

      const result = await subscriptionService.getAllSubscriptions({
        page,
        limit,
      });

      successResponse(
        res,
        200,
        result,
        "All subscriptions fetched successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------
  // GET /subscriptions/:subscriptionId — Get a single subscription
  // ---------------------------------------------------
  async getSubscriptionById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const subscriptionId = req.params.subscriptionId as string;

      if (!subscriptionId)
        throw new BadRequestError("Subscription ID is required");

      const subscription =
        await subscriptionService.getSubscriptionById(subscriptionId);

      if (!subscription) throw new NotFoundError("Subscription not found");

      // Only owner or admin can view
      if (
        subscription.ownerId.toString() !== String(req.user._id) &&
        req.user.role !== "admin"
      ) {
        throw new ForbiddenError(
          "You are not allowed to access this subscription",
        );
      }

      successResponse(
        res,
        200,
        subscription,
        "Subscription fetched successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------
  // PATCH /subscriptions/:subscriptionId — Update a subscription
  // ---------------------------------------------------
  async updateSubscription(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const subscriptionId = req.params.subscriptionId as string;

      if (!subscriptionId)
        throw new BadRequestError("Subscription ID is required");

      const {
        name,
        price,
        currency,
        category,
        frequency,
        status,
        startDate,
        isShared,
        sharedWith,
      } = req.body;

      if (
        !name &&
        !price &&
        !currency &&
        !category &&
        !frequency &&
        !status &&
        !startDate &&
        isShared === undefined &&
        !sharedWith
      ) {
        throw new BadRequestError("No fields provided to update");
      }

      const subscription = await subscriptionService.getSubscriptionById(
        subscriptionId,
        session,
      );

      if (!subscription) throw new NotFoundError("Subscription not found");

      // Only owner or admin can update
      if (subscription.ownerId.toString() !== String(req.user._id)) {
        throw new ForbiddenError(
          "You are not allowed to update this subscription",
        );
      }

      if (isShared && (!sharedWith || sharedWith.length === 0)) {
        throw new BadRequestError(
          "Shared members are required when is shared is true",
        );
      }

      const updated = await subscriptionService.updateSubscription(
        subscriptionId,
        {
          ...(name && { name }),
          ...(price && { price }),
          ...(currency && { currency }),
          ...(category && { category }),
          ...(frequency && { frequency }),
          ...(status && { status }),
          ...(startDate && { startDate: new Date(startDate) }),
          ...(isShared !== undefined && { isShared }),
          ...(sharedWith && { sharedWith }),
        },
        session,
      );

      // TODO: If startDate or frequency changed, reschedule QStash reminders
      // await rescheduleReminders(subscription, req.user.id);

      await session.commitTransaction();
      successResponse(res, 200, updated, "Subscription updated successfully");
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  }

  // ---------------------------------------------------
  // DELETE /subscriptions/:subscriptionId — Delete a subscription
  // ---------------------------------------------------
  async deleteSubscription(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const subscriptionId = req.params.subscriptionId as string;

      if (!subscriptionId)
        throw new BadRequestError("Subscription ID is required");

      const subscription = await subscriptionService.getSubscriptionById(
        subscriptionId,
        session,
      );

      if (!subscription) throw new NotFoundError("Subscription not found");

      // Only owner or admin can delete
      if (
        subscription.ownerId.toString() !== String(req.user._id) &&
        req.user.role !== "admin"
      ) {
        throw new ForbiddenError(
          "You are not allowed to delete this subscription",
        );
      }

      // TODO: Cancel all pending QStash reminders for this subscription
      // await cancelReminders(subscriptionId);

      await subscriptionService.deleteSubscription(subscriptionId, session);

      await session.commitTransaction();
      successResponse(res, 200, null, "Subscription deleted successfully");
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  }
}

export const subscriptionController = new SubscriptionController();
