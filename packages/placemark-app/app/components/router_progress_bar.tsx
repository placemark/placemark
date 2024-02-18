import { Portal } from "@radix-ui/react-portal";
import clsx from "clsx";
import { useAtom } from "jotai";
import { atomWithMachine } from "jotai-xstate";
import clamp from "lodash/clamp";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { assign, createMachine } from "xstate";

/**
 * This is all NProgress's nice defaults for how
 * quickly to increment the bar.
 */
function inc(n: number): number {
  let amount: number;

  if (n >= 0 && n < 0.2) {
    amount = 0.1;
  } else if (n >= 0.2 && n < 0.5) {
    amount = 0.04;
  } else if (n >= 0.5 && n < 0.8) {
    amount = 0.02;
  } else if (n >= 0.8 && n < 0.99) {
    amount = 0.005;
  } else {
    amount = 0;
  }

  n = clamp(n + amount, 0, 0.994);
  return n;
}

const progressMachine = createMachine<{ percent: number }>({
  id: "router-progress",
  predictableActionArguments: true,
  schema: {
    context: {} as { percent: number },
    events: {} as { type: "start" } | { type: "finish" } | { type: "tick" },
  },
  initial: "hidden",
  context: {
    percent: 0,
  },
  states: {
    hidden: {},
    visible: {
      invoke: {
        src: () => (cb) => {
          const interval = setInterval(() => {
            cb("tick");
          }, 200);

          return () => {
            clearInterval(interval);
          };
        },
      },
      on: {
        tick: {
          actions: assign({
            percent: (context) => inc(context.percent),
          }),
        },
      },
    },

    /**
     * Kind of a kludge. The intent here is to show the loading
     * bar go to 100%, then hide it after the transition. Doing this
     * in `finish` might be the right way.
     */
    done: {
      after: {
        200: {
          target: "hidden",
        },
      },
    },
  },
  on: {
    start: {
      target: "visible",
      actions: assign({
        percent: 0,
      }),
    },
    finish: {
      target: "done",
      actions: assign({
        percent: 1,
      }),
    },
  },
});

export const progressMachineAtom = atomWithMachine(() => progressMachine);

export function RouterProgressBar() {
  const [machine, send] = useAtom(progressMachineAtom);
  const router = useRouter();

  useEffect(() => {
    const sendStart = () => {
      send("start");
    };

    const sendFinish = () => {
      send("finish");
    };

    router.events.on("routeChangeStart", sendStart);
    router.events.on("routeChangeError", sendFinish);
    router.events.on("routeChangeComplete", sendFinish);

    return () => {
      router.events.off("routeChangeStart", sendStart);
      router.events.off("routeChangeError", sendFinish);
      router.events.off("routeChangeComplete", sendFinish);
    };
  }, [router, send]);

  const show = machine.matches("visible") || machine.matches("done");

  return (
    <Portal>
      <div
        className={clsx(
          "fixed top-0 left-0 right-0",
          show ? "opacity-100" : "opacity-0"
        )}
      >
        {show ? (
          <div
            className="bg-purple-300 dark:bg-purple-500 h-1 transition-all"
            style={{
              width: `${(machine.context.percent * 100).toFixed(2)}%`,
            }}
          />
        ) : null}
      </div>
    </Portal>
  );
}
