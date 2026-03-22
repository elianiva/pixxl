import { Effect, FileSystem, Layer, Path, Schema, ServiceMap } from "effect";
import {
  TerminalMetadata,
  TerminalMetadataSchema,
  CreateTerminalInput,
  UpdateTerminalInput,
  ListTerminalsInput,
} from "@pixxl/shared";
import { TerminalError } from "./error";
import { ProjectService } from "../project/service";
import { ConfigService } from "../config/service";
import { BunFileSystem, BunPath } from "@effect/platform-bun";
import { generateId } from "@/utils/id";

type TerminalServiceShape = {
  readonly createTerminal: (
    input: CreateTerminalInput,
  ) => Effect.Effect<TerminalMetadata, TerminalError>;
  readonly updateTerminal: (
    input: UpdateTerminalInput,
  ) => Effect.Effect<TerminalMetadata, TerminalError>;
  readonly listTerminals: (
    input: ListTerminalsInput,
  ) => Effect.Effect<TerminalMetadata[], TerminalError>;
};

export class TerminalService extends ServiceMap.Service<TerminalService, TerminalServiceShape>()(
  "@pixxl/TerminalService",
  {
    make: Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const projectService = yield* ProjectService;

      const createTerminal = Effect.fn("TerminalService.createTerminal")(function* (
        input: CreateTerminalInput,
      ) {
        const projects = yield* projectService.listProjects();
        const project = projects.find((p) => p.id === input.projectId);

        if (!project) {
          yield* new TerminalError({ message: `Project with id ${input.projectId} not found` });
        }

        const terminalsPath = path.join(project.path, "terminals");
        const exists = yield* fs.exists(terminalsPath);

        if (!exists) {
          yield* fs.makeDirectory(terminalsPath, { recursive: true });
        }

        const id = generateId();
        const now = new Date().toISOString();
        const metadata: TerminalMetadata = {
          id,
          name: input.name,
          createdAt: now,
          updatedAt: now,
        };

        yield* fs.writeFileString(
          path.join(terminalsPath, `${id}.json`),
          JSON.stringify(metadata, null, 2),
        );

        return metadata;
      });

      const updateTerminal = Effect.fn("TerminalService.updateTerminal")(function* (
        input: UpdateTerminalInput,
      ) {
        const projects = yield* projectService.listProjects();
        const project = projects.find((p) => p.id === input.projectId);

        if (!project) {
          yield* new TerminalError({ message: `Project with id ${input.projectId} not found` });
        }

        const filePath = path.join(project.path, "terminals", `${input.id}.json`);
        const fileExists = yield* fs.exists(filePath);

        if (!fileExists) {
          yield* new TerminalError({ message: `Terminal with id ${input.id} not found` });
        }

        const content = yield* fs.readFileString(filePath);
        const decodeUnknown = Schema.decodeUnknownEffect(
          Schema.fromJsonString(TerminalMetadataSchema),
        );
        const current = yield* decodeUnknown(content);

        const updated: TerminalMetadata = {
          ...current,
          name: input.name,
          updatedAt: new Date().toISOString(),
        };

        yield* fs.writeFileString(filePath, JSON.stringify(updated, null, 2));

        return updated;
      });

      const listTerminals = Effect.fn("TerminalService.listTerminals")(function* (
        input: ListTerminalsInput,
      ) {
        const projects = yield* projectService.listProjects();
        const project = projects.find((p) => p.id === input.projectId);

        if (!project) {
          yield* new TerminalError({ message: `Project with id ${input.projectId} not found` });
        }

        const terminalsPath = path.join(project.path, "terminals");
        const exists = yield* fs.exists(terminalsPath);

        if (!exists) {
          return [];
        }

        const entries = yield* fs.readDirectory(terminalsPath);
        const terminalFiles = entries.filter((e) => e.endsWith(".json"));

        if (terminalFiles.length === 0) {
          return [];
        }

        const decodeTerminal = Schema.decodeUnknownEffect(
          Schema.fromJsonString(TerminalMetadataSchema),
        );

        const terminals = yield* Effect.all(
          terminalFiles.map((file) =>
            fs
              .readFileString(path.join(terminalsPath, file))
              .pipe(Effect.flatMap((content) => decodeTerminal(content))),
          ),
          { concurrency: "unbounded" },
        );

        return terminals;
      });

      return { createTerminal, updateTerminal, listTerminals } as const;
    }),
  },
) {
  static layer = Layer.effect(TerminalService, TerminalService.make);
  static live = TerminalService.layer.pipe(
    Layer.provideMerge(ProjectService.layer),
    Layer.provideMerge(ConfigService.layer),
    Layer.provideMerge(Layer.mergeAll(BunFileSystem.layer, BunPath.layer)),
  );
}
