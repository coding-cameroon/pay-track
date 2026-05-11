import dayjs from "dayjs";
import mongoose from "mongoose";

import { qstash } from "./client";
import { ISubscription } from "@/models";
import { UPSTASH_WORKFLOW_URL } from "@/config/env";
import { workflowService } from "@/modules/workflows/workflow.service";

const REMINDER_DAYS = [7, 5, 3, 1];

export const scheduleSubscriptionReminders = async (
  subscription: ISubscription,
  session: mongoose.ClientSession,
) => {
  const now = dayjs();
  const nextPayment = dayjs(subscription.nextPaymentDate);

  for (const days of REMINDER_DAYS) {
    const reminderDate = nextPayment.subtract(days, "day");

    // Skip if reminder date has already passed
    if (!reminderDate.isAfter(now)) continue;

    const response = await qstash.publishJSON({
      url: UPSTASH_WORKFLOW_URL!,
      body: {
        subscriptionId: String(subscription._id),
        userId: String(subscription.ownerId),
      },
      notBefore: reminderDate.unix(),
    });

    await workflowService.createWorkflow(
      {
        subscriptionId: subscription._id,
        qstashId: response.messageId,
        scheduledFor: reminderDate.toDate(),
        reminderDaysBefore: days,
        reminderType: "payment_due",
      },
      session,
    );
  }
};
