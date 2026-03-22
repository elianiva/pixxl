import { Effect } from "effect";
import { os } from "@/contract";
import { ProjectService } from "./service";

export const createProjectRpc = os.project.createProject.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* ProjectService;
    return yield* service.createProject(input);
  }).pipe(Effect.provide(ProjectService.live), Effect.runPromise),
);

export const deleteProjectRpc = os.project.deleteProject.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* ProjectService;
    return yield* service.deleteProject(input);
  }).pipe(Effect.provide(ProjectService.live), Effect.runPromise),
);

export const listProjectsRpc = os.project.listProjects.handler(() =>
  Effect.gen(function* () {
    const service = yield* ProjectService;
    return yield* service.listProjects();
  }).pipe(Effect.provide(ProjectService.live), Effect.runPromise),
);

export const getProjectDetailRpc = os.project.getProjectDetail.handler(({ input }) =>
  Effect.gen(function* () {
    const service = yield* ProjectService;
    return yield* service.getProjectDetail(input);
  }).pipe(Effect.provide(ProjectService.live), Effect.runPromise),
);
