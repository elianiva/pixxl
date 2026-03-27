import { Effect } from "effect";
import { ORPCError } from "@orpc/server";

/**
 * Run an Effect and convert any errors to ORPCError.
 * The error's `_tag` becomes the ORPC error code, and the error object becomes `data`.
 */
export const runPromise = <A, E>(effect: Effect.Effect<A, E>): Promise<A> =>
  Effect.runPromise(effect).catch((error) => {
    const e = error as { _tag?: string; message?: string };
    const code = e._tag ?? "INTERNAL_SERVER_ERROR";
    const message = e.message ?? code;
    throw new ORPCError(code, { message, data: error });
  });
