/**
 * Managed runtime for the backend.
 * Single runtime with all services, built once and shared across all RPC handlers.
 */

import { Layer, ManagedRuntime } from "effect";

import { AgentService } from "@/features/agent/service";
import { TerminalService } from "@/features/terminal/service";
import { CommandService } from "@/features/command/service";

const RuntimeLayer = Layer.mergeAll(
  AgentService.layer,
  TerminalService.layer,
  CommandService.layer,
);

export const runtime = ManagedRuntime.make(RuntimeLayer);
export const disposeRuntime = () => runtime.dispose();
