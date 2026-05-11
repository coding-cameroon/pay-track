import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "user" | "admin";

export interface IUser extends Document {
  clerkId: string;
  email: string;
  fullName: string;
  imageUrl: string;
  imageFileId?: string;
  role: UserRole;
  pushTokens: string[];
  preferences: {
    emailReminders: boolean;
    pushReminders: boolean;
  };
}

const UserSchema = new Schema<IUser>(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    imageFileId: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      index: true,
    },
    pushTokens: {
      type: [String],
      default: [],
    },
    preferences: {
      emailReminders: { type: Boolean, default: true },
      pushReminders: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", UserSchema);
