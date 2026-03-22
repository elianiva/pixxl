import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";
import type { CreateTerminalInput, ListTerminalsInput, TerminalMetadata } from "@pixxl/shared";

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
        shell: input.shell,
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

export function useListTerminals(input: ListTerminalsInput) {
  return useQuery({
    queryKey: ["project", input.projectId, "terminals"],
    queryFn: () => rpc.terminal.listTerminals(input),
  });
}
