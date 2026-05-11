import mongoose, { Types } from "mongoose";
import { IUser, User } from "@/models";

interface CreateUserDto {
  clerkId: string;
  email: string;
  fullName: string;
  imageUrl: string;
  role: "user" | "admin";
}

interface UpdateUserDto {
  fullName?: string;
  email?: string;
  imageUrl?: string;
  imageFileId?: string;
  pushTokens?: string[];
  preferences?: {
    emailReminders?: boolean;
    pushReminders?: boolean;
  };
}

class UserService {
  async createUser(
    data: CreateUserDto,
    session: mongoose.ClientSession,
  ): Promise<IUser> {
    const [user] = await User.create([data], { session });
    return user;
  }

  async getUserById(
    id: string,
    session?: mongoose.ClientSession,
  ): Promise<IUser | null> {
    return User.findById(id).session(session ?? null);
  }

  async getUserByClerkId(
    clerkId: string,
    session?: mongoose.ClientSession,
  ): Promise<IUser | null> {
    return User.findOne({ clerkId }).session(session ?? null);
  }

  async getUsers(session?: mongoose.ClientSession): Promise<IUser[]> {
    return User.find().session(session ?? null);
  }

  async updateUser(
    id: Types.ObjectId | string,
    data: UpdateUserDto,
    session: mongoose.ClientSession,
  ): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, { $set: data }, { new: true, session });
  }

  async deleteUser(
    id: Types.ObjectId | string,
    session: mongoose.ClientSession,
  ): Promise<IUser | null> {
    return User.findByIdAndDelete(id, { session });
  }
}

export const userService = new UserService();
