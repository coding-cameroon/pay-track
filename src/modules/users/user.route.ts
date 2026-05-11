import express, { Router } from "express";

import { userController } from "./user.controller";
import { upload } from "@/middlewares/upload.middleware";
import { requireAuth } from "@/middlewares/auth.middleware";
import { permit } from "@/middlewares/permission.middleware";

const router = Router();

router.post("/webhooks/clerk", userController.handleClerkWebhook);

router.get("/", requireAuth, permit("admin"), userController.getUsers);

router.get("/:userId", requireAuth, userController.getUserById);

router.patch(
  "/:userId",
  requireAuth,
  upload.single("image"),
  userController.updateUser,
);

router.delete("/:userId", requireAuth, userController.deleteUser);

export { router as UserRouter };
