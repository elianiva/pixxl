import { Effect } from "effect";
import { os } from "@/contract";
import { runPromise } from "@/lib/error";
import { PiSettingsService } from "./service";

export const getPiSettingsRpc = os.pi.getSettings.handler(() =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* PiSettingsService;
      const settings = yield* service.getSettings();
      return settings;
    }).pipe(Effect.provide(PiSettingsService.layer)),
  ),
);

export const updatePiSettingsRpc = os.pi.setSettings.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* PiSettingsService;
      const settings = yield* service.updateSettings(input);
      return settings;
    }).pipe(Effect.provide(PiSettingsService.layer)),
  ),
);
