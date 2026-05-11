import mongoose, { Types } from "mongoose";
import { ISubscription, Subscription } from "@/models";

interface CreateSubscriptionDto {
  ownerId: Types.ObjectId | string;
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
  startDate: Date | string;
  isShared?: boolean;
  sharedWith?: { name: string; email?: string; hasPaid: boolean }[];
}

interface UpdateSubscriptionDto {
  name?: string;
  price?: number;
  currency?: "USD" | "GBP" | "XOF" | "XAF";
  category?:
    | "entertainment"
    | "utilities"
    | "software"
    | "health"
    | "lifestyle"
    | "other";
  frequency?: "daily" | "weekly" | "monthly" | "yearly";
  status?: "active" | "cancelled" | "expired";
  startDate?: Date | string;
  isShared?: boolean;
  sharedWith?: { name: string; email?: string; hasPaid: boolean }[];
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

class SubscriptionService {
  async createSubscription(
    data: CreateSubscriptionDto,
    session: mongoose.ClientSession,
  ): Promise<ISubscription> {
    const [subscription] = await Subscription.create([data], { session });
    return subscription;
  }

  async getSubscriptionById(
    id: Types.ObjectId | string,
    session?: mongoose.ClientSession,
  ): Promise<ISubscription | null> {
    return Subscription.findById(id)
      .populate("ownerId", "fullName email imageUrl")
      .session(session ?? null);
  }

  async getSubscriptionsByOwnerId(
    ownerId: Types.ObjectId | string,
    session?: mongoose.ClientSession,
  ): Promise<ISubscription[]> {
    return Subscription.find({ ownerId })
      .populate("ownerId", "fullName email imageUrl")
      .session(session ?? null);
  }

  async getActiveSubscriptionsByOwnerId(
    ownerId: Types.ObjectId | string,
    session?: mongoose.ClientSession,
  ): Promise<ISubscription[]> {
    return Subscription.find({ ownerId, status: "active" })
      .populate("ownerId", "fullName email imageUrl")
      .session(session ?? null);
  }

  // Admin — fetch all subscriptions across all users
  async getAllSubscriptions(
    options: PaginationOptions = {},
    session?: mongoose.ClientSession,
  ): Promise<PaginatedResult<ISubscription>> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Subscription.find()
        .populate("ownerId", "fullName email imageUrl")
        .skip(skip)
        .limit(limit)
        .session(session ?? null),
      Subscription.countDocuments().session(session ?? null),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    };
  }

  async updateSubscription(
    id: Types.ObjectId | string,
    data: UpdateSubscriptionDto,
    session: mongoose.ClientSession,
  ): Promise<ISubscription | null> {
    return Subscription.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, session },
    ).populate("ownerId", "fullName email imageUrl");
  }

  async updateSubscriptionStatus(
    id: Types.ObjectId | string,
    status: "active" | "cancelled" | "expired",
    session: mongoose.ClientSession,
  ): Promise<ISubscription | null> {
    return Subscription.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true, session },
    ).populate("ownerId", "fullName email imageUrl");
  }

  async deleteSubscription(
    id: Types.ObjectId | string,
    session: mongoose.ClientSession,
  ): Promise<ISubscription | null> {
    return Subscription.findByIdAndDelete(id, { session });
  }

  // Used after a payment cycle completes to advance nextPaymentDate
  async advanceNextPaymentDate(
    id: Types.ObjectId | string,
    session: mongoose.ClientSession,
  ): Promise<ISubscription | null> {
    const subscription = await Subscription.findById(id).session(session);
    if (!subscription) return null;

    const next = new Date(subscription.nextPaymentDate);

    switch (subscription.frequency) {
      case "daily":
        next.setDate(next.getDate() + 1);
        break;
      case "weekly":
        next.setDate(next.getDate() + 7);
        break;
      case "monthly":
        next.setMonth(next.getMonth() + 1);
        break;
      case "yearly":
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return Subscription.findByIdAndUpdate(
      id,
      { $set: { nextPaymentDate: next } },
      { new: true, session },
    ).populate("ownerId", "fullName email imageUrl");
  }
}

export const subscriptionService = new SubscriptionService();
