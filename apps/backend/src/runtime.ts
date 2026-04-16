/**
 * Managed runtime for the backend.
 * Single runtime with all services, built once and shared across all RPC handlers.
 */

import { Layer, ManagedRuntime } from "effect";
import { NodeFileSystem, NodePath } from "@effect/platform-node";

// Services
import { EntityService } from "@pixxl/shared";
import { ConfigService } from "@/features/config/service";
import { ProjectService } from "@/features/project/service";
import { AgentService } from "@/features/agent/service";
import { TerminalService } from "@/features/terminal/service";
import { CommandService } from "@/features/command/service";

const baseLayer = Layer.mergeAll(NodeFileSystem.layer, NodePath.layer);
const configLayer = ConfigService.layer.pipe(Layer.provideMerge(baseLayer));
const projectLayer = ProjectService.layer.pipe(Layer.provideMerge(configLayer));
const entityLayer = EntityService.layer.pipe(Layer.provideMerge(baseLayer));
const agentLayer = AgentService.layer.pipe(
  Layer.provideMerge(entityLayer),
  Layer.provideMerge(projectLayer),
);
const terminalLayer = TerminalService.layer.pipe(
  Layer.provideMerge(entityLayer),
  Layer.provideMerge(projectLayer),
  Layer.provideMerge(configLayer),
);
const commandLayer = CommandService.layer.pipe(
  Layer.provideMerge(entityLayer),
  Layer.provideMerge(projectLayer),
  Layer.provideMerge(configLayer),
);

const RuntimeLayer = Layer.mergeAll(
  baseLayer,
  configLayer,
  entityLayer,
  projectLayer,
  agentLayer,
  terminalLayer,
  commandLayer,
);

export const runtime = ManagedRuntime.make(RuntimeLayer);
export const disposeRuntime = () => runtime.dispose();