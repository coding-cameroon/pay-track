import { Router } from "express";

import { subscriptionController } from "./subscription.controller";

import { requireAuth } from "@/middlewares/auth.middleware";
import { permit } from "@/middlewares/permission.middleware";

const router = Router();

router.get(
  "/all",
  requireAuth,
  permit("admin"),
  subscriptionController.getAllSubscriptions,
);

router.get(
  "/active",
  requireAuth,
  subscriptionController.getMyActiveSubscriptions,
);

router.get("/", requireAuth, subscriptionController.getMySubscriptions);

router.get(
  "/:subscriptionId",
  requireAuth,
  subscriptionController.getSubscriptionById,
);

router.post("/", requireAuth, subscriptionController.createSubscription);

router.patch(
  "/:subscriptionId",
  requireAuth,
  subscriptionController.updateSubscription,
);

router.delete(
  "/:subscriptionId",
  requireAuth,
  subscriptionController.deleteSubscription,
);

export { router as SubscriptionRouter };
