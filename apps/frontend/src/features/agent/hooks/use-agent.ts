import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";
import type {
  CreateAgentInput,
  UpdateAgentInput,
  ListAgentsInput,
  AgentMetadata,
} from "@pixxl/shared";

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAgentInput) => rpc.agent.createAgent(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: ["project", input.projectId, "agents"],
      });

      const previousAgents = queryClient.getQueryData<AgentMetadata[]>([
        "project",
        input.projectId,
        "agents",
      ]);

      const optimisticAgent: AgentMetadata = {
        id: `temp-${Date.now()}`,
        name: input.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<AgentMetadata[]>(["project", input.projectId, "agents"], (old) => [
        ...(old ?? []),
        optimisticAgent,
      ]);

      return { previousAgents };
    },
    onError: (_err, _input, context) => {
      if (context?.previousAgents) {
        queryClient.setQueryData(["project", _input.projectId, "agents"], context.previousAgents);
      }
    },
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({ queryKey: ["project", input.projectId, "agents"] });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateAgentInput) => rpc.agent.updateAgent(input),
    onSuccess: (_data, input) => {
      // Invalidate to refetch
      queryClient.invalidateQueries({ queryKey: ["project", "agents"] });
      // Also find and update the specific agent in cache
      queryClient.setQueriesData<AgentMetadata[]>(
        { queryKey: ["project"], type: "active" },
        (old) =>
          old?.map((agent) =>
            agent.id === input.id
              ? {
                  ...agent,
                  name: input.name,
                  updatedAt: new Date().toISOString(),
                }
              : agent,
          ),
      );
    },
  });
}

export function useListAgents(input: ListAgentsInput) {
  return useQuery({
    queryKey: ["project", input.projectId, "agents"],
    queryFn: () => rpc.agent.listAgents(input),
  });
}
