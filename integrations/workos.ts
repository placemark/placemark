import { WorkOS } from "@workos-inc/node";
import { env } from "app/lib/env_server";

export const workos =
  env.WORKOS_API_KEY === "off" ? null : new WorkOS(env.WORKOS_API_KEY);
