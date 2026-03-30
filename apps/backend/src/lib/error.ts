import { ORPCError } from "@orpc/server";

export const mapToOrpcError = (error: unknown) => {
  const e = error as { _tag?: string; message?: string };
  const code = e._tag ?? "INTERNAL_SERVER_ERROR";
  const message = e.message ?? code;
  throw new ORPCError(code, { message, data: error });
};
