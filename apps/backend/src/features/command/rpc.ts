import { Effect, Option } from "effect";
import { os } from "@/contract";
import { CommandService } from "./service";
import { runtime } from "@/runtime";
import { mapToOrpcError } from "@/lib/error";

export const createCommandRpc = os.command.createCommand.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* CommandService;
    const command = yield* service.createCommand(input);
    return Option.match(command, {
      onSome: (command) => command,
      onNone: () => null,
    });
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const deleteCommandRpc = os.command.deleteCommand.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* CommandService;
    const result = yield* service.deleteCommand(input);
    return Option.getOrElse(result, () => false);
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const listCommandsRpc = os.command.listCommands.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* CommandService;
    return yield* service.listCommands(input);
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);
