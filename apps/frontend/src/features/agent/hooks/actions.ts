import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";
import { useLiveQuery } from "@tanstack/react-db";
import { getModelsCollection } from "@/features/config/models-collection";
import type { ChatSubmitOptions } from "../components/chat/input";
import type { PiAvailableModel } from "@pixxl/shared";
import { useActiveAgentId } from "./state";
import { selectAgent } from "../store";

const modelsCollection = getModelsCollection();

export function useAgentActions(projectId: string, agentId?: string) {
  const activeAgentId = useActiveAgentId();
  const targetAgentId = agentId ?? activeAgentId;

  const select = useCallback((nextAgentId: string | null) => {
    selectAgent(nextAgentId);
  }, []);

  const configureSession = useCallback(
    async (resolvedAgentId: string, options?: ChatSubmitOptions) => {
      if (!options) return;

      if (options.model && options.thinkingLevel) {
        await rpc.agent.configureAgentSession({
          projectId,
          agentId: resolvedAgentId,
          model: options.model,
          thinkingLevel: options.thinkingLevel,
        });
      } else if (options.model) {
        await rpc.agent.setAgentModel({
          projectId,
          agentId: resolvedAgentId,
          model: options.model,
        });
      } else if (options.thinkingLevel) {
        await rpc.agent.setAgentThinkingLevel({
          projectId,
          agentId: resolvedAgentId,
          thinkingLevel: options.thinkingLevel,
        });
      }
    },
    [projectId],
  );

  const sendMessage = useCallback(
    async (
      text: string,
      mode: "immediate" | "steer" | "followUp" = "immediate",
      options?: ChatSubmitOptions,
    ) => {
      const resolvedAgentId = targetAgentId;
      if (!resolvedAgentId) return;

      await configureSession(resolvedAgentId, options);

      if (mode !== "immediate") {
        await rpc.agent.enqueueAgentPrompt({
          projectId,
          agentId: resolvedAgentId,
          text,
          mode,
        });
        return;
      }

      // Fire-and-forget the prompt - events will flow through subscription
      await rpc.agent.promptAgent({
        projectId,
        agentId: resolvedAgentId,
        text,
      });
    },
    [configureSession, projectId, targetAgentId],
  );

  const abortMessage = useCallback(async () => {
    const resolvedAgentId = targetAgentId;
    if (!resolvedAgentId) return;

    await rpc.agent.abortAgent({
      projectId,
      agentId: resolvedAgentId,
    });
  }, [projectId, targetAgentId]);

  return {
    selectAgent: select,
    sendMessage,
    abortMessage,
    configureSession,
    activeAgentId: targetAgentId,
  };
}

export function useModels(): readonly PiAvailableModel[] {
  const { data: models = [] } = useLiveQuery(modelsCollection);
  return models as readonly PiAvailableModel[];
}

export function useAvailableModels(): readonly PiAvailableModel[] {
  const { data: models = [] } = useQuery({
    queryKey: ["available-models"],
    queryFn: () => rpc.agent.listAvailableModels(),
    staleTime: 5 * 60 * 1000,
  });
  return models as readonly PiAvailableModel[];
}
