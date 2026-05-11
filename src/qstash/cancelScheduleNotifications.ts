import { workflowService } from "@/modules/workflows/workflow.service.js";
import { qstash } from "./client.js";
import mongoose from "mongoose";

export const cancelSubscriptionReminders = async (
  subscriptionId: string,
  session: mongoose.ClientSession,
) => {
  const activeWorkflows = await workflowService.getWorkflowsBySubscriptionId(
    subscriptionId,
    session,
  );

  if (!activeWorkflows.length) return;

  for (const workflow of activeWorkflows) {
    try {
      await qstash.messages.cancel(workflow.qstashId);

      await workflowService.cancelWorkflow(workflow._id, session);
    } catch (error) {
      console.error(
        `Failed to cancel QStash message ${workflow.qstashId}:`,
        error,
      );
    }
  }
};
