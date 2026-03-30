import { Effect } from "effect";
import { os } from "@/contract";
import { runPromise } from "@/lib/error";
import { AgentService } from "../agent/service";

export const getPiSettingsRpc = os.pi.getSettings.handler(() =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* AgentService;
      return yield* service.getPiSettings;
    }).pipe(Effect.provide(AgentService.layer)),
  ),
);

export const updatePiSettingsRpc = os.pi.setSettings.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* AgentService;
      return yield* service.updatePiSettings(input);
    }).pipe(Effect.provide(AgentService.layer)),
  ),
);
