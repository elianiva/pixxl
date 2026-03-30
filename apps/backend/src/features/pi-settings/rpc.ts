import { Effect } from "effect";
import { os } from "@/contract";
import { AgentService } from "../agent/service";
import { runtime } from "@/runtime";
import { mapToOrpcError } from "@/lib/error";

export const getPiSettingsRpc = os.pi.getSettings.handler(() =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    return yield* service.getPiSettings;
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const updatePiSettingsRpc = os.pi.setSettings.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* AgentService;
    return yield* service.updatePiSettings(input);
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);
