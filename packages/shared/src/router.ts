import { getConfigContract, updateConfigContract } from "./contracts/config";
import {
  createProjectContract,
  deleteProjectContract,
  getProjectDetailContract,
  listProjectsContract,
} from "./contracts/project";

export const routerContract = {
  config: {
    getConfig: getConfigContract,
    updateConfig: updateConfigContract,
  },
  project: {
    createProject: createProjectContract,
    deleteProject: deleteProjectContract,
    listProjects: listProjectsContract,
    getProjectDetail: getProjectDetailContract,
  },
};
