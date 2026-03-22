import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";
import type { CreateCommandInput, ListCommandsInput, CommandMetadata } from "@pixxl/shared";

export function useCreateCommand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommandInput) => rpc.command.createCommand(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({
        queryKey: ["project", input.projectId, "commands"],
      });

      const previousCommands = queryClient.getQueryData<CommandMetadata[]>([
        "project",
        input.projectId,
        "commands",
      ]);

      const optimisticCommand: CommandMetadata = {
        id: `temp-${Date.now()}`,
        name: input.name,
        command: input.command,
        description: input.description ?? "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<CommandMetadata[]>(
        ["project", input.projectId, "commands"],
        (old) => [...(old ?? []), optimisticCommand],
      );

      return { previousCommands };
    },
    onError: (_err, _input, context) => {
      if (context?.previousCommands) {
        queryClient.setQueryData(
          ["project", _input.projectId, "commands"],
          context.previousCommands,
        );
      }
    },
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({ queryKey: ["project", input.projectId, "commands"] });
    },
  });
}

export function useListCommands(input: ListCommandsInput) {
  return useQuery({
    queryKey: ["project", input.projectId, "commands"],
    queryFn: () => rpc.command.listCommands(input),
  });
}
