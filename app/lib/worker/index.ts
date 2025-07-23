import type { Lib } from "./worker";
import * as Comlink from "comlink";
import { EitherHandler } from "./shared";

Comlink.transferHandlers.set("EITHER", EitherHandler);

export const lib = Comlink.wrap<Lib>(
	new Worker(new URL("./worker", import.meta.url)),
);
