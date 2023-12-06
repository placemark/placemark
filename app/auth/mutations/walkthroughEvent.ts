import { resolver } from "@blitzjs/rpc";
import db, { WalkthroughState } from "db";
import { WalkthroughEvent } from "../validations";
import { capture } from "integrations/posthog";
import { createMachine } from "xstate";
import { z } from "zod";

type IWalkthroughEvent = z.infer<typeof WalkthroughEvent>;

function getNextState(initial: WalkthroughState, event: IWalkthroughEvent) {
  const walkthroughMachine = createMachine<WalkthroughState>({
    predictableActionArguments: true,
    schema: {
      context: {} as WalkthroughState | undefined,
      events: {} as IWalkthroughEvent,
    },
    initial,
    on: {
      exit: WalkthroughState.V1_05_DONE,
      restart: WalkthroughState.V1_00_CREATEMAP,
    },
    states: {
      [WalkthroughState.V1_00_CREATEMAP]: {
        on: {
          next: WalkthroughState.V1_01_MENU,
        },
      },
      [WalkthroughState.V1_01_MENU]: {
        on: {
          next: WalkthroughState.V1_02_MODES,
        },
      },
      [WalkthroughState.V1_02_MODES]: {
        on: {
          next: WalkthroughState.V1_03_SEARCH,
        },
      },
      [WalkthroughState.V1_03_SEARCH]: {
        on: {
          next: WalkthroughState.V1_04_SHARE,
        },
      },
      [WalkthroughState.V1_04_SHARE]: {
        on: {
          next: WalkthroughState.V1_05_DONE,
        },
      },
      [WalkthroughState.V1_05_DONE]: {
        type: "final",
      },
    },
  });

  const { initialState } = walkthroughMachine;

  const nextState = walkthroughMachine.transition(initialState, event);

  // TODO: This value is not typed and it should be.
  // https://github.com/statelyai/xstate/issues/3504
  return nextState.value as WalkthroughState;
}

const walkthroughEvent = resolver.pipe(
  resolver.zod(WalkthroughEvent),
  resolver.authorize(),
  async function walkthroughEvent(event, ctx) {
    const previousState = await db.user.findFirstOrThrow({
      select: {
        walkthroughState: true,
      },
      where: { id: ctx.session.userId },
    });

    const nextState = getNextState(previousState.walkthroughState, event);

    await db.user.update({
      data: {
        walkthroughState: nextState,
      },
      where: { id: ctx.session.userId },
    });

    capture(ctx, {
      event: `walkthrough/${event.type}`,
      properties: {
        state: previousState.walkthroughState,
      },
    });

    return nextState;
  }
);

export default walkthroughEvent;
