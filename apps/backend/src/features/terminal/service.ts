import { Effect, FileSystem, Layer, Path, Schema, ServiceMap } from "effect";
import {
  TerminalMetadata,
  TerminalMetadataSchema,
  CreateTerminalInput,
  ListTerminalsInput,
} from "@pixxl/shared";
import { TerminalError } from "./error";
import { ProjectService } from "../project/service";
import { ConfigService } from "../config/service";
import { BunFileSystem, BunPath } from "@effect/platform-bun";
import { nanoid } from "nanoid";

function generateId(): string {
  const id = nanoid(8);
  return id.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

type TerminalServiceShape = {
  readonly createTerminal: (
    input: CreateTerminalInput,
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
          shell: input.shell,
          createdAt: now,
          updatedAt: now,
        };

        yield* fs.writeFileString(
          path.join(terminalsPath, `${id}.json`),
          JSON.stringify(metadata, null, 2),
        );

        return metadata;
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
            fs.readFileString(path.join(terminalsPath, file)).pipe(
              Effect.flatMap((content) => decodeTerminal(content)),
            ),
          ),
          { concurrency: "unbounded" },
        );

        return terminals;
      });

      return { createTerminal, listTerminals } as const;
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
