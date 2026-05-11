import { Router } from "express";

import { workflowController } from "./workflow.controller";

import { requireAuth } from "@/middlewares/auth.middleware";
import { permit } from "@/middlewares/permission.middleware";

const router = Router();

router.use(requireAuth, permit("admin"));

router.get("/", workflowController.getWorkflowsBySubscriptionId);

router.get("/pending", workflowController.getPendingWorkflowsBySubscriptionId);

router.patch("/cancel-all", workflowController.cancelAllPendingWorkflows);

router.delete("/", workflowController.deleteAllWorkflowsBySubscriptionId);

router.get("/:workflowId", workflowController.getWorkflowById);

router.patch("/:workflowId/status", workflowController.updateWorkflowStatus);

router.patch("/:workflowId/cancel", workflowController.cancelWorkflow);

router.delete("/:workflowId", workflowController.deleteWorkflow);

export { router as WorkflowRouter };
