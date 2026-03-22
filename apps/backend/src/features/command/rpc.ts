import { Effect } from "effect";
import { os } from "@/contract";
import { CommandService } from "./service";

export const createCommandRpc = os.command.createCommand.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* CommandService;
    return yield* service.createCommand(input);
  }).pipe(Effect.provide(CommandService.live), Effect.runPromise),
);

export const listCommandsRpc = os.command.listCommands.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* CommandService;
    return yield* service.listCommands(input);
  }).pipe(Effect.provide(CommandService.live), Effect.runPromise),
);
