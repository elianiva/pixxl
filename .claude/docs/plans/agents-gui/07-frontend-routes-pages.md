# Phase 7: Frontend Routes and Pages

## Goal
Set up TanStack Router routes for agents feature and create the main agents page.

## Routes

### Route Structure

```
/agents                    → AgentsPage (list view, shows last active or empty)
/agents/:sessionId         → AgentsPage with specific session selected
```

### Route Definitions

**File:** `apps/frontend/src/routes/agents/index.tsx`

```typescript
import { createFileRoute, useParams } from "@tanstack/react-router";
import { AgentsPage } from "@/features/agents/pages/AgentsPage";

export const Route = createFileRoute("/agents/")({
  component: AgentsIndex,
});

function AgentsIndex() {
  return <AgentsPage />;
}
```

**File:** `apps/frontend/src/routes/agents/$sessionId.tsx`

```typescript
import { createFileRoute } from "@tanstack/react-router";
import { AgentsPage } from "@/features/agents/pages/AgentsPage";

export const Route = createFileRoute("/agents/$sessionId")({
  component: AgentSessionRoute,
  beforeLoad: ({ params }) => {
    // Validate sessionId param
    return { sessionId: params.sessionId };
  },
});

function AgentSessionRoute() {
  const { sessionId } = Route.useParams();
  return <AgentsPage initialSessionId={sessionId} />;
}
```

## Main Page

**File:** `apps/frontend/src/features/agents/pages/AgentsPage.tsx`

```typescript
import { useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import { AgentSidebar } from "../components/AgentSidebar";
import { AgentChat } from "../components/AgentChat";
import { useProject } from "@/features/projects/hooks"; // existing
import { connectToAgentServer, agentActions } from "../store";

interface AgentsPageProps {
  initialSessionId?: string;
}

export function AgentsPage({ initialSessionId }: AgentsPageProps) {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const project = useProject(projectId);

  // Connect to WebSocket on mount
  useEffect(() => {
    if (!projectId) return;
    
    connectToAgentServer(projectId);
    
    return () => {
      // Disconnect on unmount
      disconnectFromAgentServer();
    };
  }, [projectId]);

  // Select initial session if provided
  useEffect(() => {
    if (initialSessionId) {
      agentActions.selectSession(initialSessionId);
    }
  }, [initialSessionId]);

  if (!project) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-full">
      <AgentSidebar projectId={projectId} />
      <div className="flex-1 flex flex-col min-w-0">
        <AgentHeader projectName={project.name} />
        <div className="flex-1 overflow-hidden">
          <AgentChat />
        </div>
      </div>
    </div>
  );
}
```

## Navigation Integration

Add agents link to main navigation or project sidebar.

**File:** Update existing navigation component (likely `apps/frontend/src/components/Navigation.tsx` or similar)

```typescript
// In project-specific navigation
<Link
  to="/agents"
  from="/projects/$projectId"
  className={cn(
    "flex items-center gap-2 px-3 py-2 rounded-md",
    isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
  )}
>
  <BotIcon className="h-4 w-4" />
  <span>Agents</span>
</Link>
```

## AgentsPage Components

### AgentHeader

**File:** `apps/frontend/src/features/agents/components/AgentHeader.tsx`

```typescript
import { Button } from "@/components/ui/button";
import { useActiveSession, useAgentConnection } from "../hooks";
import { ConnectionStatus } from "./ConnectionStatus";

export function AgentHeader({ projectName }: { projectName: string }) {
  const session = useActiveSession();
  const connection = useAgentConnection();

  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-3">
        <h2 className="font-semibold">
          {session?.name || "No session selected"}
        </h2>
        {session && (
          <span className="text-xs text-muted-foreground">
            {projectName}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <ConnectionStatus status={connection} />
        {session?.status === "streaming" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => agentActions.abort()}
          >
            Stop
          </Button>
        )}
      </div>
    </div>
  );
}
```

### Empty State

When no sessions exist:

```typescript
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <BotIcon className="h-12 w-12 text-muted-foreground" />
      <h3 className="text-lg font-medium">No active sessions</h3>
      <p className="text-sm text-muted-foreground">
        Create a new session to start chatting with the agent
      </p>
      <Button onClick={onCreate}>Create Session</Button>
    </div>
  );
}
```

## Files to Create
- `apps/frontend/src/routes/agents/index.tsx` - route definition
- `apps/frontend/src/routes/agents/$sessionId.tsx` - route with param
- `apps/frontend/src/features/agents/pages/AgentsPage.tsx` - main page
- `apps/frontend/src/features/agents/components/AgentHeader.tsx`
- `apps/frontend/src/features/agents/components/ConnectionStatus.tsx`

## Files to Modify
- `apps/frontend/src/routeTree.gen.ts` - auto-generated, verify routes appear
- Navigation component - add agents link

## Testing
- [ ] Route `/agents` loads without errors
- [ ] Route `/agents/:sessionId` selects correct session
- [ ] Navigation from project to agents works
- [ ] WebSocket connects on page load
- [ ] Empty state shows when no sessions
- [ ] Creating session from empty state works

## Dependencies on Phase 5-6
- Uses AgentSidebar from Phase 5
- Uses AgentChat from Phase 5
- Uses ToolCallDisplay from Phase 6

## Out of Scope
- No URL-based session sharing (can be added later)
- No deep linking beyond session selection
- No browser history for chat navigation
