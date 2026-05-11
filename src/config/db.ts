import mongoose from "mongoose";
import { DATABASE_URL } from "./env";
import { logger } from "../logger/logger";

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL not passed in the .env file. Consider doing that.",
  );
}

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(DATABASE_URL!);
    logger.info(`Connected to mongoDB with host: ${conn.connection.host}`);
  } catch (error) {
    throw new Error(`Failed to connect to mongoDB - ${error}`);
    process.exit(1);
  }
};
