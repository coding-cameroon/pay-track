import nodemailer from "nodemailer";

import { APP_PASSWORD, APP_USER } from "./env";

const transporter = nodemailer.createTransport({
  service: "smtp",
  auth: {
    user: APP_USER,
    pass: APP_PASSWORD,
  },
});

export { transporter };
