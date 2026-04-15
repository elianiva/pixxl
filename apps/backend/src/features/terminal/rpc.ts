import { Effect, Option } from "effect";
import { os } from "@/contract";
import { TerminalService } from "./service";
import { terminalManager } from "./manager";
import { ConfigService } from "../config/service";
import { runtime } from "@/runtime";
import { mapToOrpcError } from "@/lib/error";

export const createTerminalRpc = os.terminal.createTerminal.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* TerminalService;
    const terminal = yield* service.createTerminal(input);
    return Option.match(terminal, {
      onSome: (terminal) => terminal,
      onNone: () => null,
    });
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const updateTerminalRpc = os.terminal.updateTerminal.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* TerminalService;
    const terminal = yield* service.updateTerminal(input);
    return Option.match(terminal, {
      onSome: (terminal) => terminal,
      onNone: () => null,
    });
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const deleteTerminalRpc = os.terminal.deleteTerminal.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* TerminalService;
    const deleted = yield* service.deleteTerminal(input);
    return deleted;
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const listTerminalsRpc = os.terminal.listTerminals.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* TerminalService;
    return yield* service.listTerminals(input);
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const connectTerminalRpc = os.terminal.connectTerminal.handler(({ input }) =>
  Effect.gen(function* () {
    const configService = yield* ConfigService;
    const config = yield* configService.loadConfig();

    const terminalService = yield* TerminalService;
    const terminalResult = yield* terminalService.getTerminal({
      projectId: input.projectId,
      id: input.id,
    });

    const shell = Option.match(terminalResult, {
      onSome: (t) => t.shell ?? config.terminal.shell,
      onNone: () => config.terminal.shell,
    });

    terminalManager.getOrCreate({
      terminalId: input.id,
      shell,
    });

    return {
      success: true,
      websocketUrl: "/pty?terminalId=" + encodeURIComponent(input.id),
    };
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);
