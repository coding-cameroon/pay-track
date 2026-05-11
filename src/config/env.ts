import { config } from "dotenv";

const dotenv = config({ override: true, quiet: true });

export const {
  // app
  PORT,
  NODE_ENV,
  CLIENT_URL,

  // db
  ADMIN_EMAIL,
  DATABASE_URL,

  // image kit
  IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_PRIVATE_KEY,
  IMAGEKIT_URL_ENDPOINT,

  // clerk
  CLERK_SECRET_KEY,
  CLERK_PUBLISHABLE_KEY,
  CLERK_WEBHOOK_SIGNING_SECRET,

  // qstash
  QSTASH_URL,
  QSTASH_TOKEN,
  QSTASH_CURRENT_SIGNING_KEY,
  QSTASH_NEXT_SIGNING_KEY,

  // arcjet
  ARCJET_ENV,
  ARCJET_KEY,

  // nodemailer
  APP_USER,
  APP_PASSWORD,
} = process.env;
