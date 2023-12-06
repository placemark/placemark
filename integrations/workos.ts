import { WorkOS } from "@workos-inc/node";
import { env } from "app/lib/env_server";

export const workos = new WorkOS(env.WORKOS_API_KEY);
