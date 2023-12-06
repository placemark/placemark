import type { HandlerContext } from "types";
import { Mode } from "state/jotai";
import { useNoneHandlers } from "app/lib/handlers/none";
import { useLassoHandlers } from "app/lib/handlers/lasso";
import { useRectangleHandlers } from "app/lib/handlers/rectangle";
import { useCircleHandlers } from "app/lib/handlers/circle";
import { useLineHandlers } from "app/lib/handlers/line";
import { usePointHandlers } from "app/lib/handlers/point";
import { usePolygonHandlers } from "app/lib/handlers/polygon";

export function useHandlers(handlerContext: HandlerContext) {
  const HANDLERS: Record<Mode, Handlers> = {
    [Mode.NONE]: useNoneHandlers(handlerContext),
    [Mode.DRAW_POINT]: usePointHandlers(handlerContext),
    [Mode.DRAW_LINE]: useLineHandlers(handlerContext),
    [Mode.DRAW_POLYGON]: usePolygonHandlers(handlerContext),
    [Mode.DRAW_RECTANGLE]: useRectangleHandlers(handlerContext),
    [Mode.DRAW_CIRCLE]: useCircleHandlers(handlerContext),
    [Mode.LASSO]: useLassoHandlers(handlerContext),
  };
  return HANDLERS;
}
