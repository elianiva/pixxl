import { useMutation } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";
import { CreateProjectInput } from "@pixxl/shared";

export function useCreateProject() {
  return useMutation({
    mutationFn: (input: CreateProjectInput) => rpc.project.createProject(input),
  });
}
