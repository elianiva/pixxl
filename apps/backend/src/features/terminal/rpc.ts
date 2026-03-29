import { Effect, Option, Layer } from "effect";
import { os } from "@/contract";
import { TerminalService } from "./service";
import { terminalManager } from "./manager";
import { ConfigService } from "../config/service";
import { runPromise } from "@/lib/error";

export const createTerminalRpc = os.terminal.createTerminal.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* TerminalService;
      const terminal = yield* service.createTerminal(input);
      return Option.match(terminal, {
        onSome: (terminal) => terminal,
        onNone: () => null,
      });
    }).pipe(Effect.provide(TerminalService.layer)),
  ),
);

export const updateTerminalRpc = os.terminal.updateTerminal.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* TerminalService;
      const terminal = yield* service.updateTerminal(input);
      return Option.match(terminal, {
        onSome: (terminal) => terminal,
        onNone: () => null,
      });
    }).pipe(Effect.provide(TerminalService.layer)),
  ),
);

export const deleteTerminalRpc = os.terminal.deleteTerminal.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* TerminalService;
      const deleted = yield* service.deleteTerminal(input);
      return deleted;
    }).pipe(Effect.provide(TerminalService.layer)),
  ),
);

export const listTerminalsRpc = os.terminal.listTerminals.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* TerminalService;
      return yield* service.listTerminals(input);
    }).pipe(Effect.provide(TerminalService.layer)),
  ),
);

export const connectTerminalRpc = os.terminal.connectTerminal.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const configService = yield* ConfigService;
      const config = yield* configService.loadConfig();

      // Try to get stored shell from terminal metadata for resuming
      const terminalService = yield* TerminalService;
      const terminalResult = yield* terminalService.getTerminal({
        projectId: input.projectId,
        id: input.id,
      });

      // Use stored shell if available, otherwise fall back to current config
      const shell = Option.match(terminalResult, {
        onSome: (t) => t.shell ?? config.terminal.shell,
        onNone: () => config.terminal.shell,
      });

      terminalManager.getOrCreate({
        terminalId: input.id,
        shell,
      });

      return { success: true, websocketUrl: `/terminal/${input.id}` };
    }).pipe(Effect.provide(Layer.merge(TerminalService.layer, ConfigService.live))),
  ),
);
