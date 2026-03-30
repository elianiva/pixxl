import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useParams, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { rpc } from "@/lib/rpc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RiHistoryLine, RiLoader4Line, RiAddLine } from "@remixicon/react";

interface SessionSwitcherProps {
  projectId?: string;
  agentId?: string;
}

function useAgentRouteParams() {
  const projectId = useParams({ select: (p) => p.projectId as string | undefined, strict: false });
  const routerState = useRouterState();
  const resolvedPath = routerState.resolvedLocation?.pathname ?? "";
  const agentMatch = resolvedPath.match(/\/agent\/([^/]+)/);
  const agentId = agentMatch?.[1];
  return { projectId, agentId };
}

interface SessionOption {
  id: string;
  path: string;
  label: string;
}

export function SessionSwitcher({
  projectId: propProjectId,
  agentId: propAgentId,
}: SessionSwitcherProps) {
  const routeParams = useAgentRouteParams();
  const projectId = propProjectId ?? routeParams.projectId;
  const agentId = propAgentId ?? routeParams.agentId;

  const queryClient = useQueryClient();

  // Get current session from runtime
  const { data: runtimeState } = useQuery({
    queryKey: ["agent-runtime", projectId, agentId],
    queryFn: () => rpc.agent.getAgentRuntime({ projectId: projectId!, agentId: agentId! }),
    enabled: !!projectId && !!agentId,
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["attachable-sessions", projectId],
    queryFn: () => rpc.agent.listAttachableSessions({ projectId: projectId! }),
    enabled: !!projectId,
  });

  const switchSessionMutation = useMutation({
    mutationFn: ({ sessionFile }: { sessionFile: string }) =>
      rpc.agent.switchSession({ projectId: projectId!, agentId: agentId!, sessionFile }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["agent-session-details", projectId, agentId],
      });
      void queryClient.invalidateQueries({ queryKey: ["agent-runtime", projectId, agentId] });
      void queryClient.invalidateQueries({ queryKey: ["agent-history", projectId, agentId] });
      void queryClient.invalidateQueries({ queryKey: ["agent-interactions", projectId, agentId] });
      void queryClient.invalidateQueries({ queryKey: ["attachable-sessions", projectId] });
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: () => rpc.agent.createSession({ projectId: projectId!, agentId: agentId! }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["agent-session-details", projectId, agentId],
      });
      void queryClient.invalidateQueries({ queryKey: ["agent-runtime", projectId, agentId] });
      void queryClient.invalidateQueries({ queryKey: ["agent-history", projectId, agentId] });
      void queryClient.invalidateQueries({ queryKey: ["agent-interactions", projectId, agentId] });
      void queryClient.invalidateQueries({ queryKey: ["attachable-sessions", projectId] });
    },
  });

  const sessionOptions: SessionOption[] = sessions.map((session) => ({
    id: session.id,
    path: session.path,
    label: session.firstMessage || session.name || session.id,
  }));

  // Track selected value locally for immediate UI feedback
  const [selectedSession, setSelectedSession] = useState(runtimeState?.currentSessionFile ?? "");

  // Sync with server state when it changes (e.g., after create/mutation success)
  useEffect(() => {
    if (runtimeState?.currentSessionFile) {
      setSelectedSession(runtimeState.currentSessionFile);
    }
  }, [runtimeState?.currentSessionFile]);

  // Don't render if we're not on an agent route
  if (!projectId || !agentId) {
    return null;
  }

  const handleCreateSession = () => {
    createSessionMutation.mutate();
  };

  const hasSessions = sessions.length > 0;

  const isPending = switchSessionMutation.isPending || createSessionMutation.isPending;

  return (
    <div className="flex items-center gap-2">
      <RiHistoryLine className="size-3.5 text-muted-foreground" />
      <Select
        value={selectedSession}
        onValueChange={(sessionFile) => {
          if (sessionFile && sessionFile !== selectedSession) {
            setSelectedSession(sessionFile);
            switchSessionMutation.mutate({ sessionFile });
          }
        }}
        disabled={isPending || isLoading || !hasSessions}
      >
        <SelectTrigger className="h-7 w-72 text-xs" size="sm">
          {isPending ? (
            <RiLoader4Line className="size-3.5 animate-spin" />
          ) : (
            <SelectValue placeholder={hasSessions ? "Select session..." : "No sessions"} />
          )}
        </SelectTrigger>
        <SelectContent className="max-h-80 w-72">
          {sessionOptions.map((session) => (
            <SelectItem
              key={session.id}
              value={session.path}
              title={session.label}
              className="pr-2"
            >
              <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
                {session.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="default"
        onClick={handleCreateSession}
        disabled={isPending}
        title="New session"
      >
        <RiAddLine className="size-3.5" />
        New Session
      </Button>
    </div>
  );
}
