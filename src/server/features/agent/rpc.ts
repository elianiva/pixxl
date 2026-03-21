import { Schema } from "effect";
import { os } from "@orpc/server";

const HelloSchema = Schema.Struct({
  message: Schema.String,
});

export const helloRpc = os
  .input(Schema.toStandardSchemaV1(HelloSchema))
  .output(Schema.toStandardSchemaV1(HelloSchema))
  .handler(({ input }) => {
    return {
      message: `Hello ${input.message}!`,
    };
  })
  .callable();
