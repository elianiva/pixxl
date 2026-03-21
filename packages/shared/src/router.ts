import { getConfigContract, updateConfigContract } from "./contracts/config";
import { createProjectContract } from "./contracts/project";

export const routerContract = {
  config: {
    getConfig: getConfigContract,
    updateConfig: updateConfigContract,
  },
  project: {
    createProject: createProjectContract,
  },
};
