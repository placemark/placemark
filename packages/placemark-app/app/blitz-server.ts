/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

import { setupBlitzServer } from "@blitzjs/next";
import {
  simpleRolesIsAuthorized,
  AuthServerPlugin,
  PrismaStorage,
} from "@blitzjs/auth";
import { BlitzLogger, BlitzServerMiddleware } from "blitz";
import db from "db";
import { authConfig } from "./blitz-client";
import { logger } from "integrations/log";
import * as Sentry from "@sentry/nextjs";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

export const { gSSP, gSP, api } = setupBlitzServer({
  plugins: [
    AuthServerPlugin({
      ...authConfig,
      storage: PrismaStorage(db),
      isAuthorized: simpleRolesIsAuthorized,
      /**
       * https://github.com/blitz-js/blitz/blob/fe2e4eb1e99ab5161300add7f1be24c89c855775/packages/blitz-auth/src/server/auth-plugin.ts#L72
       *
       * By default, sessions expire after 30 days,
       * and are refreshed every 7.5. Bump that up to a year.
       */
      sessionExpiryMinutes: 365 * 24 * 60,
    }),
    BlitzServerMiddleware(async (req, res, next) => {
      try {
        return await next();
      } catch (e) {
        Sentry.captureException(e);
        if (e instanceof ZodError) {
          res.statusCode = 400;
          // https://github.com/blitz-js/blitz/issues/4295
          // @ts-expect-error This is a bug in Blitz defs
          res.send({ error: "Bad request", issues: e.issues });
          res.end();
          return;
        } else if (e instanceof Prisma.PrismaClientKnownRequestError) {
          res.statusCode = 404;
          // @ts-expect-error This is a bug in Blitz defs
          res.send({ error: "Not found" });
          res.end();
          return;
        }
        res.statusCode = 500;
        // @ts-expect-error This is a bug in Blitz defs
        res.send({ error: "Internal error" });
        res.end();
        return;
      }
    }),
  ],
  onError: (e) => {
    Sentry.captureException(e);
  },
  logger:
    process.env.NODE_ENV === "development"
      ? BlitzLogger({ type: "json" })
      : logger,
});
