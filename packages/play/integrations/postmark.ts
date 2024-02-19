import { env } from "app/lib/env_server";
import nodemailer from "nodemailer";
import postmarkTransport from "nodemailer-postmark-transport";

const { NODE_ENV } = process.env;

const transport = nodemailer.createTransport(
  NODE_ENV === "production" || env.POSTMARK_SERVER_API_TOKEN
    ? // eslint-disable-next-line
      postmarkTransport({
        auth: {
          apiKey: env.POSTMARK_SERVER_API_TOKEN,
        },
      })
    : {
        streamTransport: true,
      }
);

export default transport;
