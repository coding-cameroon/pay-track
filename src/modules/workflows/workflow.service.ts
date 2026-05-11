import mongoose, { Types } from "mongoose";
import { IWorkflow, Workflow } from "@/models";

interface CreateWorkflowDto {
  subscriptionId: Types.ObjectId | string;
  qstashId: string;
  scheduledFor: Date | string;
  reminderDaysBefore: number;
  reminderType?: "payment_due";
}

interface UpdateWorkflowStatusDto {
  status: "pending" | "completed" | "failed" | "cancelled";
}

class WorkflowService {
  // Create a single workflow tracking doc
  async createWorkflow(
    data: CreateWorkflowDto,
    session: mongoose.ClientSession,
  ): Promise<IWorkflow> {
    const [workflow] = await Workflow.create([data], { session });
    return workflow;
  }

  // Create multiple workflow docs at once — used when scheduling all reminders on subscription create
  async createManyWorkflows(
    data: CreateWorkflowDto[],
    session: mongoose.ClientSession,
  ): Promise<IWorkflow[]> {
    return Workflow.insertMany(data, { session });
  }

  async getWorkflowById(
    id: Types.ObjectId | string,
    session?: mongoose.ClientSession,
  ): Promise<IWorkflow | null> {
    return Workflow.findById(id)
      .populate("subscriptionId")
      .session(session ?? null);
  }

  // Get all workflows for a subscription — used to check existing reminders
  async getWorkflowsBySubscriptionId(
    subscriptionId: Types.ObjectId | string,
    session?: mongoose.ClientSession,
  ): Promise<IWorkflow[]> {
    return Workflow.find({ subscriptionId })
      .populate("subscriptionId")
      .session(session ?? null);
  }

  // Get only pending workflows for a subscription — used before rescheduling
  async getPendingWorkflowsBySubscriptionId(
    subscriptionId: Types.ObjectId | string,
    session?: mongoose.ClientSession,
  ): Promise<IWorkflow[]> {
    return Workflow.find({ subscriptionId, status: "pending" })
      .populate("subscriptionId")
      .session(session ?? null);
  }

  // Check if a specific reminder already exists — guards against duplicates
  async getExistingWorkflow(
    subscriptionId: Types.ObjectId | string,
    reminderDaysBefore: number,
    reminderType: "payment_due",
    session?: mongoose.ClientSession,
  ): Promise<IWorkflow | null> {
    return Workflow.findOne({
      subscriptionId,
      reminderDaysBefore,
      reminderType,
    }).session(session ?? null);
  }

  async updateWorkflowStatus(
    id: Types.ObjectId | string,
    data: UpdateWorkflowStatusDto,
    session: mongoose.ClientSession,
  ): Promise<IWorkflow | null> {
    return Workflow.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, session },
    ).populate("subscriptionId");
  }

  // Mark a workflow as cancelled — called when a subscription is edited or deleted
  async cancelWorkflow(
    id: Types.ObjectId | string,
    session: mongoose.ClientSession,
  ): Promise<IWorkflow | null> {
    return Workflow.findByIdAndUpdate(
      id,
      { $set: { status: "cancelled" } },
      { new: true, session },
    );
  }

  // Cancel all pending workflows for a subscription at once
  async cancelAllPendingWorkflows(
    subscriptionId: Types.ObjectId | string,
    session: mongoose.ClientSession,
  ): Promise<void> {
    await Workflow.updateMany(
      { subscriptionId, status: "pending" },
      { $set: { status: "cancelled" } },
      { session },
    );
  }

  async deleteWorkflow(
    id: Types.ObjectId | string,
    session: mongoose.ClientSession,
  ): Promise<IWorkflow | null> {
    return Workflow.findByIdAndDelete(id, { session });
  }

  // Hard delete all workflows for a subscription — called when subscription is deleted
  async deleteAllWorkflowsBySubscriptionId(
    subscriptionId: Types.ObjectId | string,
    session: mongoose.ClientSession,
  ): Promise<void> {
    await Workflow.deleteMany({ subscriptionId }, { session });
  }
}

export const workflowService = new WorkflowService();
