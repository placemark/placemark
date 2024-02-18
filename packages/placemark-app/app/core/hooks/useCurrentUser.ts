import { useQuery } from "@blitzjs/rpc";
import * as Sentry from "@sentry/nextjs";
import type { CurrentUser } from "app/users/queries/getCurrentUser";
import getCurrentUser from "app/users/queries/getCurrentUser";
import { DEFAULT_QUERY_OPTIONS } from "app/lib/constants";

export const useCurrentUser = () => {
  const [user] = useQuery(getCurrentUser, null, DEFAULT_QUERY_OPTIONS);
  try {
    Sentry.setUser({ email: user.email, id: String(user.id) });
  } catch (e) {
    Sentry.captureException(e);
  }
  return user;
};

export type { CurrentUser };
