import mongoose, { Schema, Document, Types } from "mongoose";

export type ReminderType = "payment_due";

export interface IWorkflow extends Document {
  subscriptionId: Types.ObjectId;
  qstashId: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  scheduledFor: Date;
  reminderDaysBefore: number;
  reminderType: ReminderType;
}

const WorkflowSchema = new Schema<IWorkflow>(
  {
    subscriptionId: {
      type: Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    qstashId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
    },
    scheduledFor: {
      type: Date,
      required: true,
    },
    reminderDaysBefore: {
      type: Number,
      required: true,
    },
    reminderType: {
      type: String,
      enum: ["payment_due"],
      default: "payment_due",
    },
  },
  { timestamps: true },
);

WorkflowSchema.index(
  { subscriptionId: 1, reminderDaysBefore: 1, reminderType: 1 },
  { unique: true },
);

export const Workflow = mongoose.model("Workflow", WorkflowSchema);
