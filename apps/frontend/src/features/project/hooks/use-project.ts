import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";
import type {
  CreateProjectInput,
  DeleteProjectInput,
  GetProjectDetailInput,
  ListProjectsInput,
} from "@pixxl/shared";

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => rpc.project.createProject(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteProjectInput) => rpc.project.deleteProject(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["projects"] });

      const previousProjects = queryClient.getQueryData<{ id: string }[]>(["projects", {}]);

      queryClient.setQueriesData<{ id: string }[]>({ queryKey: ["projects"] }, (old) =>
        old?.filter((project) => project.id !== input.id),
      );

      return { previousProjects };
    },
    onError: (_err, _input, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(["projects", {}], context.previousProjects);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useListProjects(options: ListProjectsInput = {}) {
  return useQuery({
    queryKey: ["projects", options],
    queryFn: () => rpc.project.listProjects(options),
  });
}

export function useGetProjectDetail(input: GetProjectDetailInput) {
  return useQuery({
    queryKey: ["project", input.id],
    queryFn: () => rpc.project.getProjectDetail(input),
  });
}
