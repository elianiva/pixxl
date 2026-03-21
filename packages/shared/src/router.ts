import { getConfigContract, updateConfigContract } from "./contracts/config";

export const routerContract = {
  config: {
    getConfig: getConfigContract,
    updateConfig: updateConfigContract,
  },
};
