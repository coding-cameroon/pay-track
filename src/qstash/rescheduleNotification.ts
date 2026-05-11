import mongoose from "mongoose";

import { qstash } from "./client";

import { ISubscription } from "@/models/subscription.model";
import { workflowService } from "@/modules/workflows/workflow.service";
import { scheduleSubscriptionReminders } from "./scheduleNotifications";

export const rescheduleSubscriptionReminders = async (
  subscription: ISubscription,
  session: mongoose.ClientSession,
) => {
  const activeWorkflows = await workflowService.getWorkflowsBySubscriptionId(
    subscription._id,
    session,
  );

  for (const workflow of activeWorkflows) {
    if (workflow.status === "pending") {
      await qstash.messages.cancel(workflow.qstashId);

      await workflowService.cancelWorkflow(workflow._id, session);
    }
  }

  await scheduleSubscriptionReminders(subscription, session);
};
