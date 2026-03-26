import { Store } from "@tanstack/react-store";

export interface AgentStoreState {
  activeAgentId: string | null;
}

const initialState: AgentStoreState = {
  activeAgentId: null,
};

export const agentStore = new Store<AgentStoreState>(initialState);

export function selectAgent(agentId: string | null) {
  agentStore.setState((state) => ({
    ...state,
    activeAgentId: agentId,
  }));
}

export function resetStore() {
  agentStore.setState(() => initialState);
}
