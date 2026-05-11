import mongoose from "mongoose";
import type { NextFunction, Request, Response } from "express";

import { userService } from "@/modules/users/user.service";
import { successResponse } from "@/utils/responses";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
} from "@/errors/AppError";
import { mediaService } from "../media/media.service.js";
import { verifyWebhook } from "@clerk/express/webhooks";

class UserController {
  // ---------------------------------------------------
  // CLERK WEBHOOK — POST /webhooks/clerk
  // Syncs Clerk user events to MongoDB
  // ---------------------------------------------------
  async handleClerkWebhook(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const evt = await verifyWebhook(req);
      if (!evt) {
        throw new InternalError("Webhook event not passed. Please try again.");
      }

      const { data, type } = evt;

      switch (type) {
        case "user.created": {
          const { id, email_addresses, first_name, last_name, image_url } =
            data;

          const email = email_addresses?.[0]?.email_address;

          if (!id || !email || !first_name || !last_name || !image_url) {
            throw new BadRequestError(
              "Missing required fields from Clerk payload",
            );
          }

          const existing = await userService.getUserByClerkId(id, session);
          if (existing) throw new ConflictError("User already exists");

          await userService.createUser(
            {
              clerkId: id,
              email,
              fullName: `${first_name} ${last_name}`,
              imageUrl: image_url,
            },
            session,
          );

          break;
        }

        case "user.updated": {
          const { id, email_addresses, first_name, last_name, image_url } =
            data;

          const email = email_addresses?.[0]?.email_address;

          if (!id) throw new BadRequestError("Missing Clerk user ID");

          const user = await userService.getUserByClerkId(id, session);
          if (!user) throw new NotFoundError("User not found");

          await userService.updateUser(
            user._id,
            {
              ...(email && { email }),
              ...(first_name &&
                last_name && { fullName: `${first_name} ${last_name}` }),
              ...(image_url && { imageUrl: image_url }),
            },
            session,
          );

          break;
        }

        case "user.deleted": {
          const { id } = data;

          if (!id) throw new BadRequestError("Missing Clerk user ID");

          const user = await userService.getUserByClerkId(id, session);
          if (!user) throw new NotFoundError("User not found");

          await userService.deleteUser(user._id, session);

          break;
        }

        default:
          // Unhandled event type — acknowledge without processing
          break;
      }

      await session.commitTransaction();
      successResponse(res, 200, null, "Webhook processed successfully");
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  }

  // ---------------------------------------------------
  // GET /users — Admin only
  // ---------------------------------------------------
  async getUsers(_: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await userService.getUsers();
      successResponse(res, 200, users, "Users fetched successfully");
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------
  // GET /users/:userId
  // ---------------------------------------------------
  async getUserById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const userId = req.params.userId as string;

      if (!userId) throw new BadRequestError("User ID is required");

      // Only the user themselves or an admin can access
      if (String(req.user._id) !== userId && req.user.role !== "admin") {
        throw new ForbiddenError("You are not allowed to access this account");
      }

      const user = await userService.getUserById(userId);
      if (!user) throw new NotFoundError("User not found");

      successResponse(res, 200, user, "User fetched successfully");
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------
  // PATCH /users/:userId — Update profile
  // ---------------------------------------------------
  async updateUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userId = req.params.userId as string;

      if (!userId) throw new BadRequestError("User ID is required");

      // Only the user themselves or an admin can update
      if (String(req.user._id) !== userId && req.user.role !== "admin") {
        throw new ForbiddenError("You are not allowed to update this account");
      }

      const { fullName, email, pushTokens, preferences } = req.body;

      if (!fullName && !email && !pushTokens && !preferences) {
        throw new BadRequestError("No fields provided to update");
      }

      const user = await userService.getUserById(userId, session);
      if (!user) throw new NotFoundError("User not found");

      // Prevent a non-admin from elevating their own role
      if (req.body.role && req.user.role !== "admin") {
        throw new ForbiddenError("You are not allowed to change your role");
      }

      // Handle image upload if a file was passed
      let imageUrl: string | undefined;
      let imageFileId: string | undefined;

      if (req.file) {
        const uploaded = await mediaService.uploadImage(req.file, "profile");
        imageUrl = uploaded.url;
        imageFileId = uploaded.fileId;

        if (user.imageFileId) {
          await mediaService.deleteImage(user.imageFileId);
        }
      }

      const updated = await userService.updateUser(
        userId,
        {
          ...(fullName && { fullName }),
          ...(email && { email }),
          ...(imageUrl && { imageUrl }),
          ...(imageFileId && { imageFileId }),
          ...(pushTokens && { pushTokens }),
          ...(preferences && { preferences }),
        },
        session,
      );

      await session.commitTransaction();
      successResponse(res, 200, updated, "User updated successfully");
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  }

  // ---------------------------------------------------
  // DELETE /users/:userId
  // ---------------------------------------------------
  async deleteUser(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const userId = req.params.userId as string;

      if (!userId) throw new BadRequestError("User ID is required");

      // Only the user themselves or an admin can delete
      if (String(req.user._id) !== userId && req.user.role !== "admin") {
        throw new ForbiddenError("You are not allowed to delete this account");
      }

      const user = await userService.getUserById(userId, session);
      if (!user) throw new NotFoundError("User not found");

      // If user has a custom ImageKit image, delete it before deleting the account
      if (user.imageFileId) {
        await mediaService.deleteImage(user.imageFileId);
      }

      await userService.deleteUser(userId, session);

      await session.commitTransaction();
      successResponse(res, 200, null, "User deleted successfully");
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  }
}

export const userController = new UserController();
