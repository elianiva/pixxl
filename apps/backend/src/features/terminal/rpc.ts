import { Effect } from "effect";
import { os } from "@/contract";
import { TerminalService } from "./service";

export const createTerminalRpc = os.terminal.createTerminal.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* TerminalService;
    return yield* service.createTerminal(input);
  }).pipe(Effect.provide(TerminalService.live), Effect.runPromise),
);

export const listTerminalsRpc = os.terminal.listTerminals.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* TerminalService;
    return yield* service.listTerminals(input);
  }).pipe(Effect.provide(TerminalService.live), Effect.runPromise),
);
