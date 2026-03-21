import { os } from "./contract";
import { getConfigRpc, updateConfigRpc } from "./features/config/rpc";
import { createProjectRpc } from "./features/project/rpc";

export const router = os.router({
  config: {
    getConfig: getConfigRpc,
    updateConfig: updateConfigRpc,
  },
  project: {
    createProject: createProjectRpc,
  },
});
