import db from "db";

export async function setup() {
  await db.$reset();
}
