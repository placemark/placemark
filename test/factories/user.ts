import signup from "app/auth/mutations/signup";
import db from "db";
import Chance from "chance";
import { Ctx } from "blitz";

const chance = new Chance();

const ctx = {
  session: { $create: () => {} },
} as unknown as Ctx;

type UserAttributes = {
  email?: string;
  name?: string;
  organizationName?: string;
  password: string;
};

export const user = async ({
  email = chance.email(),
  name = chance.name(),
  organizationName = chance.name(),
  password,
}: UserAttributes) => {
  await signup(
    {
      name,
      email,
      organizationName,
      password,
      subscribe: false,
    },
    ctx
  );

  return await db.user.findFirstOrThrow({
    where: {
      email,
    },
  });
};

export type User = Awaited<ReturnType<typeof user>>;
