import { Store } from "@tanstack/react-store";

export interface ProjectState {
  currentProjectId: string | null;
}

export const projectStore = new Store<ProjectState>({
  currentProjectId: null,
});
