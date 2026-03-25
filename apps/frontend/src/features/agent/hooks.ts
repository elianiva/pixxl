import { useCallback } from "react";
import { useStore } from "@tanstack/react-store";
import { useLiveQuery } from "@tanstack/react-db";
import { projectStore } from "@/lib/project-store";
import { getInteractionsCollection, sendAgentMessage } from "./interactions-collection";
import { agentStore, selectAgent } from "./store";

function messageTextFromContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const block = item as { type?: unknown; text?: unknown };
      return block.type === "text" && typeof block.text === "string" ? block.text : "";
    })
    .join("");
}

export function useActiveAgentId(): string | null {
  return useStore(agentStore, (state) => state.activeAgentId);
}

export function useMessages(
  agentId?: string,
): Array<{ id: string; role: "user" | "assistant"; content: string }> {
  const activeAgentId = useActiveAgentId();
  const targetAgentId = agentId ?? activeAgentId;
  const projectId = useStore(projectStore, (state) => state.currentProjectId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const interactions = useLiveQuery(
    projectId && targetAgentId
      ? getInteractionsCollection(projectId, targetAgentId)
      : (null as any),
  );

  return (interactions.data ?? []).reduce<
    Array<{ id: string; role: "user" | "assistant"; content: string }>
  >((acc, item) => {
    if (item.entry.type !== "message") return acc;

    const message = item.entry.message as {
      role?: "user" | "assistant";
      content?: unknown;
    };

    const role: "user" | "assistant" = message.role === "assistant" ? "assistant" : "user";

    acc.push({
      id: item.entry.id,
      role,
      content: messageTextFromContent(message.content),
    });

    return acc;
  }, []);
}

export function useAgentActions(projectId: string) {
  const activeAgentId = useActiveAgentId();

  const select = useCallback((agentId: string | null) => {
    selectAgent(agentId);
  }, []);

  const sendPrompt = useCallback(
    async (text: string, mode: "immediate" | "steer" | "followUp" = "immediate") => {
      const agentId = activeAgentId;
      if (!agentId) return;

      // Send message - backend handles persistence and streaming
      const stream = await sendAgentMessage(projectId, agentId, text, mode);

      for await (const event of stream) {
        // Events are used for UI feedback (thinking, tools, etc.)
        // The collection will refetch after stream completes
        console.debug("Agent event:", event);
      }
    },
    [activeAgentId, projectId],
  );

  return {
    selectAgent: select,
    sendPrompt,
    activeAgentId,
  };
}
