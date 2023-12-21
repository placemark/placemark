import { Logger } from "tslog";
import { Logtail } from "@logtail/node";
import type { ILogObj } from "tslog";
import { LogLevel } from "@logtail/types";
import type { Context } from "@logtail/types";
import { env } from "app/lib/env_server";
import stripAnsi from "strip-ansi";
import { ILogObjMeta } from "tslog/dist/types/interfaces";

const prod = process.env.NODE_ENV === "production";

/**
 * Mimic Blitz's configuration
 * https://git.io/J1MqJ
 */
const logger = new Logger<ILogObj>({
  name: "placemark-app",
  type: prod ? "json" : "pretty",
  argumentsArrayName: "argumentsArray",
  // displayFunctionName: false,
  // displayRequestId: false,
  // dateTimePattern: prod
  //   ? "year-month-day hour:minute:second.millisecond"
  //   : "hour:minute:second.millisecond",
  // dateTimeTimezone: prod
  //   ? "utc"
  //   : Intl.DateTimeFormat().resolvedOptions().timeZone,
  /**
   * Supress stdout in production.
   */
  // suppressStdOutput: process.env.NODE_ENV === "production",
});

if (prod && env.LOGTAIL_TOKEN !== "off") {
  const logtail = new Logtail(env.LOGTAIL_TOKEN);

  const logToTail = (logObject: ILogObj & ILogObjMeta) => {
    const argumentsArray = logObject.argumentsArray;
    const logLevel = logObject?._meta?.logLevelName;
    if (!Array.isArray(argumentsArray) || !logLevel) return;
    const maybeMessage = argumentsArray[0];
    const context = argumentsArray[1] as Context;
    logtail
      .log(
        typeof maybeMessage === "string"
          ? stripAnsi(maybeMessage)
          : "NO_MESSAGE",
        logLevel as LogLevel,
        typeof context === "string" ? { context: stripAnsi(context) } : context
      )
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error(e);
      });
  };

  logger.attachTransport(logToTail);
}

export { logger };
