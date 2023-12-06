import { rpcHandler } from "@blitzjs/rpc";
import { api } from "app/blitz-server";
import { captureException } from "@sentry/nextjs";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import { NotFoundError } from "blitz";

export default api(
  rpcHandler({
    onError: (e) => {
      // console.error(e);

      // If this is a Prisma not found error,
      // make it 404-like and exit without
      // logging to Sentry.
      if (e instanceof PrismaClientKnownRequestError && e.code === "P2025") {
        Object.assign(e, { statusCode: 404 });
        captureException(e);
        return;
      }

      // If this is a Blitz not found error,
      // also exit without sending to Sentry.
      if (e instanceof NotFoundError) {
        return;
      }

      captureException(e);
    },
  })
);
