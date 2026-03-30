import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useParams, useRouterState } from "@tanstack/react-router";
import { rpc } from "@/lib/rpc";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RiHistoryLine, RiLoader4Line } from "@remixicon/react";

interface SessionSwitcherProps {
  projectId?: string;
  agentId?: string;
  currentSessionFile?: string;
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
  currentSessionFile,
}: SessionSwitcherProps) {
  const routeParams = useAgentRouteParams();
  const projectId = propProjectId ?? routeParams.projectId;
  const agentId = propAgentId ?? routeParams.agentId;

  const queryClient = useQueryClient();

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
    },
  });

  const sessionOptions: SessionOption[] = sessions.map((session) => ({
    id: session.id,
    path: session.path,
    label: session.firstMessage || session.name || session.id,
  }));

  const currentValue = currentSessionFile ?? "";

  // Don't render if we're not on an agent route
  if (!projectId || !agentId) {
    return null;
  }

  const hasSessions = sessions.length > 0;

  return (
    <div className="flex items-center gap-2">
      <RiHistoryLine className="size-3.5 text-muted-foreground" />
      <Select
        value={currentValue}
        onValueChange={(sessionFile) => {
          if (sessionFile && sessionFile !== currentSessionFile) {
            switchSessionMutation.mutate({ sessionFile });
          }
        }}
        disabled={switchSessionMutation.isPending || isLoading || !hasSessions}
      >
        <SelectTrigger className="h-7 w-80 text-xs" size="sm">
          {switchSessionMutation.isPending ? (
            <RiLoader4Line className="size-3.5 animate-spin" />
          ) : (
            <SelectValue placeholder={hasSessions ? "Select session..." : "No sessions"} />
          )}
        </SelectTrigger>
        <SelectContent className="max-h-80 w-80">
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
    </div>
  );
}
