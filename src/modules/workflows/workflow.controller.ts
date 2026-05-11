import mongoose, { Types } from "mongoose";
import type { NextFunction, Request, Response } from "express";

import { workflowService } from "./workflow.service";
import { successResponse } from "@/utils/responses";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/errors/AppError";
import { cancelSubscriptionReminders } from "@/qstash/cancelScheduleNotifications.js";

class WorkflowController {
  // ---------------------------------------------------
  // GET /workflows — Admin: get all workflows for a subscription
  // GET /workflows?subscriptionId=xxx
  // ---------------------------------------------------
  async getWorkflowsBySubscriptionId(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const subscriptionId = req.query.subscriptionId as string;

      if (!subscriptionId) {
        throw new BadRequestError("Subscription ID is required");
      }

      const workflows =
        await workflowService.getWorkflowsBySubscriptionId(subscriptionId);

      successResponse(res, 200, workflows, "Workflows fetched successfully");
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------
  // GET /workflows/pending?subscriptionId=xxx
  // ---------------------------------------------------
  async getPendingWorkflowsBySubscriptionId(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const subscriptionId = req.query.subscriptionId as string;

      if (!subscriptionId) {
        throw new BadRequestError("Subscription ID is required");
      }

      const workflows =
        await workflowService.getPendingWorkflowsBySubscriptionId(
          subscriptionId,
        );

      successResponse(
        res,
        200,
        workflows,
        "Pending workflows fetched successfully",
      );
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------
  // GET /workflows/:workflowId
  // ---------------------------------------------------
  async getWorkflowById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const workflowId = req.params.workflowId as string;

      if (!workflowId) throw new BadRequestError("Workflow ID is required");

      const workflow = await workflowService.getWorkflowById(workflowId);
      if (!workflow) throw new NotFoundError("Workflow not found");

      successResponse(res, 200, workflow, "Workflow fetched successfully");
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------
  // PATCH /workflows/:workflowId/status — Admin: update workflow status
  // ---------------------------------------------------
  async updateWorkflowStatus(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const workflowId = req.params.workflowId as string;

      if (!workflowId) throw new BadRequestError("Workflow ID is required");

      const { status } = req.body;

      if (!status) throw new BadRequestError("Status is required");

      if (!["pending", "completed", "failed", "cancelled"].includes(status)) {
        throw new BadRequestError("Invalid status value");
      }

      const workflow = await workflowService.getWorkflowById(
        workflowId,
        session,
      );
      if (!workflow) throw new NotFoundError("Workflow not found");

      const updated = await workflowService.updateWorkflowStatus(
        workflowId,
        { status },
        session,
      );

      await session.commitTransaction();
      successResponse(
        res,
        200,
        updated,
        "Workflow status updated successfully",
      );
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  }

  // ---------------------------------------------------
  // PATCH /workflows/:workflowId/cancel — Admin: cancel a single workflow
  // ---------------------------------------------------
  async cancelWorkflow(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const workflowId = req.params.workflowId as string;

      if (!workflowId) throw new BadRequestError("Workflow ID is required");

      const workflow = await workflowService.getWorkflowById(
        workflowId,
        session,
      );
      if (!workflow) throw new NotFoundError("Workflow not found");

      if (workflow.status !== "pending") {
        throw new BadRequestError("Only pending workflows can be cancelled");
      }

      // Cancel the QStash job before marking as cancelled
      try {
        await cancelSubscriptionReminders(
          String(workflow.subscriptionId),
          session,
        );
      } catch (err) {
        console.warn(`failed to mark workdflow are cancelled: ${err}`);
      }

      const cancelled = await workflowService.cancelWorkflow(
        workflowId,
        session,
      );

      await session.commitTransaction();
      successResponse(res, 200, cancelled, "Workflow cancelled successfully");
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  }

  // ---------------------------------------------------
  // PATCH /workflows/cancel-all?subscriptionId=xxx — Admin: cancel all pending workflows
  // ---------------------------------------------------
  async cancelAllPendingWorkflows(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const subscriptionId = req.query.subscriptionId as string;

      if (!subscriptionId) {
        throw new BadRequestError("Subscription ID is required");
      }

      const pendingWorkflows =
        await workflowService.getPendingWorkflowsBySubscriptionId(
          subscriptionId,
          session,
        );

      if (pendingWorkflows.length === 0) {
        throw new NotFoundError(
          "No pending workflows found for this subscription",
        );
      }

      // TODO: Cancel each QStash job before marking as cancelled
      // for (const workflow of pendingWorkflows) {
      //   await qstash.messages.delete(workflow.qstashId);
      // }

      await workflowService.cancelAllPendingWorkflows(subscriptionId, session);

      await session.commitTransaction();
      successResponse(
        res,
        200,
        null,
        "All pending workflows cancelled successfully",
      );
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  }

  // ---------------------------------------------------
  // DELETE /workflows/:workflowId — Admin: hard delete a workflow
  // ---------------------------------------------------
  async deleteWorkflow(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const workflowId = req.params.workflowId as string;

      if (!workflowId) throw new BadRequestError("Workflow ID is required");

      const workflow = await workflowService.getWorkflowById(
        workflowId,
        session,
      );
      if (!workflow) throw new NotFoundError("Workflow not found");

      if (workflow.status === "pending") {
        throw new BadRequestError("Cancel the workflow before deleting it");
      }

      await workflowService.deleteWorkflow(workflowId, session);

      await session.commitTransaction();
      successResponse(res, 200, null, "Workflow deleted successfully");
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  }

  // ---------------------------------------------------
  // DELETE /workflows?subscriptionId=xxx — Admin: hard delete all workflows for a subscription
  // ---------------------------------------------------
  async deleteAllWorkflowsBySubscriptionId(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const subscriptionId = req.query.subscriptionId as string;

      if (!subscriptionId) {
        throw new BadRequestError("Subscription ID is required");
      }

      const workflows = await workflowService.getWorkflowsBySubscriptionId(
        subscriptionId,
        session,
      );

      if (workflows.length === 0) {
        throw new NotFoundError("No workflows found for this subscription");
      }

      if (workflows.some((w) => w.status === "pending")) {
        throw new BadRequestError(
          "Cancel all pending workflows before deleting",
        );
      }

      await workflowService.deleteAllWorkflowsBySubscriptionId(
        subscriptionId,
        session,
      );

      await session.commitTransaction();
      successResponse(res, 200, null, "All workflows deleted successfully");
    } catch (error) {
      await session.abortTransaction();
      next(error);
    } finally {
      session.endSession();
    }
  }
}

export const workflowController = new WorkflowController();
