// PACKAGE IMPORTS
import cors from "cors";
import express from "express";
import { createServer } from "http";
import type { Request, Response } from "express";
import { clerkMiddleware } from "@clerk/express";

// LOGGER
import { logger } from "./logger/logger";

// CONFIGS
import { connectDB } from "./config/db";
import { CLIENT_URL, PORT } from "./config/env";

// MIDDLEWARES
import { globalErrorHandler } from "./middlewares/error.middleware";
import { arcjetMiddleware } from "./middlewares/arcjet.middleware";

// ROUTES
import { UserRouter } from "./modules/users/user.route";
import { WorkflowRouter } from "./modules/workflows/workflow.route";
import { SubscriptionRouter } from "./modules/subscriptions/subscription.route";

// SERVER
const app = express();
const server = createServer(app);

// MIDDLEWARES
app.use(
  cors({
    credentials: true,
    origin: CLIENT_URL || "*",
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(clerkMiddleware());

app.use(arcjetMiddleware);

// ROUTES
app.get("/api/v1/health", (_: Request, res: Response) => {
  return res.status(200).json({ success: true, message: "Server running" });
});
app.use("/api/v1/users", UserRouter);
app.use("/api/v1/workflows", WorkflowRouter);
app.use("/api/v1/subscriptions", SubscriptionRouter);

// 404 ROUTES
app.use((_: Request, res: Response) => {
  return res
    .status(404)
    .json({ successs: false, message: "ROUTE NOT FOUND.", statusCode: 404 });
});

// last middleware to be used
app.use(globalErrorHandler);

export const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      logger.log("info", `Server running on  http://localhost:${PORT}`);
    });
  } catch (err) {
    logger.error("Failed to start server: ", err);
    process.exit(1);
  }
};

startServer();
