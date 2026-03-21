import { helloRpc } from "./features/agent/rpc";

export const router = {
  agent: {
    hello: helloRpc,
  },
};
