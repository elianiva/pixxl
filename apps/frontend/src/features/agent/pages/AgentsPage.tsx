"use client";

import { useEffect } from "react";
import { useStore } from "@tanstack/react-store";
import { useParams } from "@tanstack/react-router";
import { AgentSidebar } from "../components/agent-sidebar";
import { AgentChat } from "../components/agent-chat";
import { ConnectionStatus } from "../components/ConnectionStatus";
import { Button } from "@/components/ui/button";
import { RiRobot2Line } from "@remixicon/react";
import { agentStore, selectSession } from "../store";
import { rpc } from "@/lib/rpc";

interface AgentsPageProps {
  initialSessionId?: string;
}

export function AgentsPage({ initialSessionId }: AgentsPageProps) {
  const { projectId } = useParams({ from: "/app/$projectId/agent/" });
  const activeSession = useStore(agentStore, (state) =>
    state.activeSessionId ? (state.sessions[state.activeSessionId] ?? null) : null,
  );
  const connectionStatus = useStore((state) => state.connectionStatus);

  // Connect to WebSocket and load sessions on mount
  useEffect(() => {
    if (!projectId) return;

    // Load sessions from the server
    rpc.agent
      .listSessions({ projectId })
      .then((sessions) => {
        // Add sessions to the store
        agentStore.setState((state) => {
          const updatedSessions = { ...state.sessions };
          for (const session of sessions) {
            if (!updatedSessions[session.id]) {
              updatedSessions[session.id] = {
                ...session,
                messages: [],
                isStreaming: false,
                toolCalls: [],
              };
            }
          }
          return {
            ...state,
            sessions: updatedSessions,
            activeSessionId: state.activeSessionId ?? sessions[0]?.id ?? null,
          };
        });
      })
      .catch((error) => {
        console.error("[AgentsPage] Failed to load sessions:", error);
      });

    return () => {
      // Reset active session on unmount
      agentStore.setState((state) => ({
        ...state,
        activeSessionId: null,
      }));
    };
  }, [projectId]);

  // Select initial session if provided
  useEffect(() => {
    if (initialSessionId) {
      selectSession(initialSessionId);
    }
  }, [initialSessionId]);

  return (
    <div className="flex h-full">
      <AgentSidebar projectId={projectId} />
      <div className="flex flex-1 flex-col min-w-0">
        <AgentHeader sessionName={activeSession?.name} connectionStatus={connectionStatus} />
        <div className="flex-1 overflow-hidden">
          {activeSession ? <AgentChat /> : <EmptyState />}
        </div>
      </div>
    </div>
  );
}

interface AgentHeaderProps {
  sessionName?: string;
  connectionStatus: "idle" | "connecting" | "streaming" | "error";
}

function AgentHeader({ sessionName, connectionStatus }: AgentHeaderProps) {
  const isStreaming = connectionStatus === "streaming";

  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-3">
        <RiRobot2Line className="size-5 text-muted-foreground" />
        <h2 className="font-semibold">{sessionName || "No session selected"}</h2>
      </div>
      <div className="flex items-center gap-2">
        <ConnectionStatus status={connectionStatus} />
        {isStreaming && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Abort streaming - this will be handled by AgentChat
            }}
          >
            Stop
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="rounded-full bg-muted p-4">
        <RiRobot2Line className="size-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">No session selected</h3>
      <p className="text-sm text-muted-foreground">
        Create a new session from the sidebar to start chatting with the agent
      </p>
    </div>
  );
}
