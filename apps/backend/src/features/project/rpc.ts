import { Effect, Option } from "effect";
import { os } from "@/contract";
import { ProjectService } from "./service";
import { runPromise } from "@/lib/error";

export const createProjectRpc = os.project.createProject.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* ProjectService;
      return yield* service.createProject(input);
    }).pipe(Effect.provide(ProjectService.live)),
  ),
);

export const deleteProjectRpc = os.project.deleteProject.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* ProjectService;
      return yield* service.deleteProject(input);
    }).pipe(Effect.provide(ProjectService.live)),
  ),
);

export const listProjectsRpc = os.project.listProjects.handler(() =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* ProjectService;
      return yield* service.listProjects();
    }).pipe(Effect.provide(ProjectService.live)),
  ),
);

export const getProjectDetailRpc = os.project.getProjectDetail.handler(({ input }) =>
  runPromise(
    Effect.gen(function* () {
      const service = yield* ProjectService;
      const project = yield* service.getProjectDetail(input);
      return Option.match(project, {
        onNone: () => null,
        onSome: (project) => project,
      });
    }).pipe(Effect.provide(ProjectService.live)),
  ),
);
