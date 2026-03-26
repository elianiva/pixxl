import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";
import { UpdateConfigInput } from "@pixxl/shared/contracts/config";

export function useConfig() {
  return useQuery({
    queryKey: ["config"],
    queryFn: () => rpc.config.getConfig(),
    staleTime: Infinity,
  });
}

export function useAgentFrontendConfig() {
  return useQuery({
    queryKey: ["agent-frontend-config"],
    queryFn: () => rpc.agent.getAgentFrontendConfig(),
    staleTime: Infinity,
  });
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: UpdateConfigInput) => rpc.config.updateConfig(config),
    onSuccess: (data) => {
      queryClient.setQueryData(["config"], data);
    },
  });
}
