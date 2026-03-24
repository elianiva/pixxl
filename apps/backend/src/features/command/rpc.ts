import { Effect, Option } from "effect";
import { os } from "@/contract";
import { CommandService } from "./service";
import { mapToOrpcError } from "@/lib/error";

export const createCommandRpc = os.command.createCommand.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* CommandService;
    const command = yield* service.createCommand(input);
    return Option.match(command, {
      onSome: (command) => command,
      onNone: () => null,
    });
  }).pipe(
    Effect.provide(CommandService.layer),
    mapToOrpcError({ feature: "command" }),
    Effect.runPromise,
  ),
);

export const deleteCommandRpc = os.command.deleteCommand.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* CommandService;
    return yield* service.deleteCommand(input);
  }).pipe(
    Effect.provide(CommandService.layer),
    mapToOrpcError({ feature: "command" }),
    Effect.runPromise,
  ),
);

export const listCommandsRpc = os.command.listCommands.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* CommandService;
    return yield* service.listCommands(input);
  }).pipe(
    Effect.provide(CommandService.layer),
    mapToOrpcError({ feature: "command" }),
    Effect.runPromise,
  ),
);
