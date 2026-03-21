import { os } from "./contract";
import { getConfigRpc, updateConfigRpc } from "./features/config/rpc";

export const router = os.router({
  config: {
    getConfig: getConfigRpc,
    updateConfig: updateConfigRpc,
  },
});
