import { Effect, Option } from "effect";
import { os } from "@/contract";
import { ProjectService } from "./service";
import { runtime } from "@/runtime";
import { mapToOrpcError } from "@/lib/error";

export const createProjectRpc = os.project.createProject.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* ProjectService;
    return yield* service.createProject(input);
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const deleteProjectRpc = os.project.deleteProject.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* ProjectService;
    return yield* service.deleteProject(input);
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const listProjectsRpc = os.project.listProjects.handler(() =>
  Effect.gen(function* () {
    const service = yield* ProjectService;
    return yield* service.listProjects();
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);

export const getProjectDetailRpc = os.project.getProjectDetail.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* ProjectService;
    const project = yield* service.getProjectDetail(input);
    return Option.match(project, {
      onNone: () => null,
      onSome: (project) => project,
    });
  })
    .pipe(runtime.runPromise)
    .catch(mapToOrpcError),
);
