import winston from "winston";

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return stack
    ? `[${timestamp}] ${level}: ${stack}`
    : `[${timestamp}] ${level}: ${message}`;
});

// Console format (colorized)
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  logFormat,
);

// File format (no colors, structured)
const fileFormat = combine(timestamp(), errors({ stack: true }), json());

winston.addColors({
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
});

export const logger = winston.createLogger({
  level: "info",

  transports: [
    // 🖥️ Console (colorized)
    new winston.transports.Console({
      format: consoleFormat,
    }),

    // 📁 All logs
    new winston.transports.File({
      filename: "src/logger/combined.log",
      format: fileFormat,
    }),

    // ❌ Error logs only
    new winston.transports.File({
      filename: "src/logger/error.log",
      level: "error",
      format: fileFormat,
    }),
  ],
});
