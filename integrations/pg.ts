import { Pool } from "pg";
import { env } from "app/lib/env_server";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});
