import mongoose, { Schema, Document, Types } from "mongoose";

export interface ISharedMember {
  name: string;
  email?: string;
  hasPaid: boolean;
}

export interface ISubscription extends Document {
  ownerId: Types.ObjectId;
  name: string;
  price: number;
  currency: "USD" | "GBP" | "XOF" | "XAF";
  category:
    | "entertainment"
    | "utilities"
    | "software"
    | "health"
    | "lifestyle"
    | "other";
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  status: "active" | "cancelled" | "expired";
  startDate: Date;
  nextPaymentDate: Date;
  isShared: boolean;
  sharedWith: ISharedMember[];
}

const SunscriptionSchema = new Schema<ISubscription>(
  {
    ownerId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      enum: ["USD", "GBP", "XOF", "XAF"],
      default: "USD",
    },
    category: {
      type: String,
      enum: [
        "entertainment",
        "utilities",
        "software",
        "health",
        "lifestyle",
        "other",
      ],
      required: true,
    },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "yearly"],
      default: "monthly",
    },
    status: {
      type: String,
      enum: ["active", "cancelled", "expired"],
      default: "active",
    },
    startDate: {
      type: Date,
      required: true,
    },
    nextPaymentDate: {
      type: Date,
    },
    isShared: {
      type: Boolean,
      default: false,
    },
    sharedWith: [
      {
        name: { type: String, required: true },
        email: { type: String },
        hasPaid: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

SunscriptionSchema.index({ ownerId: 1, status: 1 });
SunscriptionSchema.virtual("individualShare").get(function () {
  if (!this.isShared || this.sharedWith.length === 0) return this.price;

  return this.price / (this.sharedWith.length + 1);
});

export const Subscription = mongoose.model("Subscription", SunscriptionSchema);
