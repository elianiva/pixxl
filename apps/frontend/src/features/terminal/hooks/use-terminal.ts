import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";
import type {
  CreateTerminalInput,
  UpdateTerminalInput,
  ListTerminalsInput,
  TerminalMetadata,
} from "@pixxl/shared";

export function useCreateTerminal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTerminalInput) => rpc.terminal.createTerminal(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: ["project", input.projectId, "terminals"],
      });

      const previousTerminals = queryClient.getQueryData<TerminalMetadata[]>([
        "project",
        input.projectId,
        "terminals",
      ]);

      const optimisticTerminal: TerminalMetadata = {
        id: `temp-${Date.now()}`,
        name: input.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<TerminalMetadata[]>(
        ["project", input.projectId, "terminals"],
        (old) => [...(old ?? []), optimisticTerminal],
      );

      return { previousTerminals };
    },
    onError: (_err, _input, context) => {
      if (context?.previousTerminals) {
        queryClient.setQueryData(
          ["project", _input.projectId, "terminals"],
          context.previousTerminals,
        );
      }
    },
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({ queryKey: ["project", input.projectId, "terminals"] });
    },
  });
}

export function useUpdateTerminal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTerminalInput) => rpc.terminal.updateTerminal(input),
    onSuccess: (_data, input) => {
      // Invalidate to refetch
      queryClient.invalidateQueries({ queryKey: ["project", "terminals"] });
      // Also find and update the specific terminal in cache
      queryClient.setQueriesData<TerminalMetadata[]>(
        { queryKey: ["project"], type: "active" },
        (old) =>
          old?.map((terminal) =>
            terminal.id === input.id
              ? {
                  ...terminal,
                  name: input.name,
                  updatedAt: new Date().toISOString(),
                }
              : terminal,
          ),
      );
    },
  });
}

export function useListTerminals(input: ListTerminalsInput) {
  return useQuery({
    queryKey: ["project", input.projectId, "terminals"],
    queryFn: () => rpc.terminal.listTerminals(input),
  });
}
