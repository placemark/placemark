import { useMutation, useQuery } from "@blitzjs/rpc";
import { WalkthroughState } from "@prisma/client";
import { captureException } from "@sentry/nextjs";
import walkthroughEventMutation from "app/auth/mutations/walkthroughEvent";
import { WalkthroughEvent } from "app/auth/validations";
import getWalkthroughState from "app/users/queries/getWalkthroughState";
import { useCallback } from "react";
import { z } from "zod";

export function useWalkthrough(id: WalkthroughState) {
  const [walkthroughState, { setQueryData }] = useQuery(
    getWalkthroughState,
    {},
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );

  const [walkthroughEvent] = useMutation(walkthroughEventMutation);

  const sendEvent = useCallback(
    (type: z.infer<typeof WalkthroughEvent>["type"]) => {
      walkthroughEvent({ type })
        .then((newState) => {
          return setQueryData(newState);
        })
        .catch((e) => captureException(e));
    },
    [walkthroughEvent, setQueryData]
  );

  return [
    walkthroughState === id,
    {
      next: () => sendEvent("next"),
      restart: () => sendEvent("restart"),
      exit: () => sendEvent("exit"),
    },
  ] as const;
}
