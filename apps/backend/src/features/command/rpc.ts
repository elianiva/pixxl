import { Effect, Option } from "effect";
import { os } from "@/contract";
import { CommandService } from "./service";
import { runPromise } from "@/lib/error";

export const createCommandRpc = os.command.createCommand.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* CommandService;
      const command = yield* service.createCommand(input);
      return Option.match(command, {
        onSome: (command) => command,
        onNone: () => null,
      });
    }).pipe(Effect.provide(CommandService.layer)),
  ),
);

export const deleteCommandRpc = os.command.deleteCommand.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* CommandService;
      const result = yield* service.deleteCommand(input);
      return Option.getOrElse(result, () => false);
    }).pipe(Effect.provide(CommandService.layer)),
  ),
);

export const listCommandsRpc = os.command.listCommands.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* CommandService;
      return yield* service.listCommands(input);
    }).pipe(Effect.provide(CommandService.layer)),
  ),
);
