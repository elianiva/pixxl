import { Console, Effect, Option } from "effect";
import { os } from "@/contract";
import { TerminalService } from "./service";
import { terminalManager } from "./manager";
import { ConfigService } from "../config/service";
import { mapToOrpcError } from "@/lib/error";

export const createTerminalRpc = os.terminal.createTerminal.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* TerminalService;
    const terminal = yield* service.createTerminal(input);
    return Option.match(terminal, {
      onSome: (terminal) => terminal,
      onNone: () => null,
    });
  }).pipe(
    Effect.provide(TerminalService.layer),
    mapToOrpcError({ feature: "terminal" }),
    Effect.runPromise,
  ),
);

export const updateTerminalRpc = os.terminal.updateTerminal.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* TerminalService;
    const terminal = yield* service.updateTerminal(input);
    return Option.match(terminal, {
      onSome: (terminal) => terminal,
      onNone: () => null,
    });
  }).pipe(
    Effect.provide(TerminalService.layer),
    mapToOrpcError({ feature: "terminal" }),
    Effect.runPromise,
  ),
);

export const deleteTerminalRpc = os.terminal.deleteTerminal.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* TerminalService;
    return yield* service.deleteTerminal(input);
  }).pipe(
    Effect.provide(TerminalService.layer),
    mapToOrpcError({ feature: "terminal" }),
    Effect.runPromise,
  ),
);

export const listTerminalsRpc = os.terminal.listTerminals.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* TerminalService;
    return yield* service.listTerminals(input);
  }).pipe(
    Effect.provide(TerminalService.layer),
    mapToOrpcError({ feature: "terminal" }),
    Effect.runPromise,
  ),
);

export const connectTerminalRpc = os.terminal.connectTerminal.handler(({ input }) =>
  Effect.gen(function* () {
    const configService = yield* ConfigService;
    const config = yield* configService.loadConfig();

    Console.log({ config });

    terminalManager.getOrCreate({
      terminalId: input.id,
      shell: config.terminal.shell,
    });

    return { success: true, websocketUrl: `/terminal/${input.id}` };
  }).pipe(
    Effect.provide(ConfigService.live),
    mapToOrpcError({ feature: "terminal" }),
    Effect.runPromise,
  ),
);
