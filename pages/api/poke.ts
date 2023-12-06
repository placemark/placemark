import { api } from "app/blitz-server";
import * as Sentry from "@sentry/nextjs";
import type { NextApiRequest, NextApiResponse } from "next";

type Listener = () => void;
type ListenerMap = Map<string, Set<Listener>>;

export function getPokeBackend() {
  // The SSE impl has to keep process-wide state using the global object.
  // Otherwise the state is lost during hot reload in dev.
  const global = globalThis as unknown as {
    _pokeBackend: SSEPokeBackend | undefined;
  };
  if (!global._pokeBackend) {
    global._pokeBackend = new SSEPokeBackend();
  }
  return global._pokeBackend;
}

/**
 * Implements the poke backend using server-sent events.
 */
class SSEPokeBackend {
  private _listeners: ListenerMap;

  constructor() {
    this._listeners = new Map();
  }

  addListener(spaceID: string, listener: () => void) {
    let set = this._listeners.get(spaceID);
    if (!set) {
      set = new Set();
      this._listeners.set(spaceID, set);
    }
    set.add(listener);
    return () => this._removeListener(spaceID, listener);
  }

  poke(spaceID: string) {
    const set = this._listeners.get(spaceID);
    if (!set) {
      return;
    }
    for (const listener of set) {
      try {
        listener();
      } catch (e) {
        Sentry.captureException(e);
      }
    }
  }

  private _removeListener(spaceID: string, listener: () => void) {
    const set = this._listeners.get(spaceID);
    if (!set) {
      return;
    }
    set.delete(listener);
  }
}

export default api(function handlePokeSSE(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const spaceID = req.query["id"]?.toString();
  if (!spaceID) {
    return;
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "text/event-stream;charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");

  res.write(`id: ${Date.now()}\n`);
  res.write(`data: hello\n\n`);

  const pokeBackend = getPokeBackend();

  const unlisten = pokeBackend.addListener(spaceID, () => {
    res.write(`id: ${Date.now()}\n`);
    res.write(`data: poke\n\n`);
  });

  setInterval(() => {
    res.write(`id: ${Date.now()}\n`);
    res.write(`data: beat\n\n`);
  }, 30 * 1000);

  res.on("close", () => {
    unlisten();
  });
});
