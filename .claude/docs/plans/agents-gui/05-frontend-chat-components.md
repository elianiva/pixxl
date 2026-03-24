# Phase 5: Frontend Chat Components

## Goal
Build chat UI using AI Elements components with streaming markdown support.

## Components to Implement

### 1. AgentChat Container

**File:** `apps/frontend/src/features/agents/components/AgentChat.tsx`

```typescript
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "ai-elements/prompt-input";
import { useActiveSession } from "../hooks";
import { agentActions } from "../store";

export function AgentChat() {
  const session = useActiveSession();
  const [inputText, setInputText] = useState("");

  const handleSubmit = () => {
    if (!inputText.trim()) return;
    agentActions.sendPrompt(inputText);
    setInputText("");
  };

  return (
    <div className="flex h-full flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {session?.messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.role === "assistant" ? (
                  <AgentMessageContent message={message} />
                ) : (
                  message.content
                )}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <PromptInput onSubmit={handleSubmit}>
        <PromptInputTextarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ask the agent..."
          className="min-h-24"
        />
        <PromptInputFooter>
          <PromptInputSubmit disabled={!inputText.trim()} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
```

### 2. AgentMessageContent with Streaming

**File:** `apps/frontend/src/features/agents/components/AgentMessageContent.tsx`

```typescript
import { useMemo } from "react";
import { MessageResponse } from "ai-elements/message";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "ai-elements/reasoning";
import { createStreamedMessage } from "streamdown";
import { useAgentMessage } from "../hooks";
import { ToolCallDisplay } from "./ToolCallDisplay";

interface AgentMessageContentProps {
  message: AgentMessage;
}

export function AgentMessageContent({ message }: AgentMessageContentProps) {
  // streamdown for markdown streaming
  const streamedContent = useMemo(() => {
    if (!message.isStreaming) return message.content;
    return createStreamedMessage(message.content, {
      isStreaming: message.isStreaming,
      showCursor: true,
    });
  }, [message.content, message.isStreaming]);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {/* Reasoning block */}
      {message.reasoning && (
        <Reasoning>
          <ReasoningTrigger />
          <ReasoningContent>
            {message.reasoning}
          </ReasoningContent>
        </Reasoning>
      )}

      {/* Tool calls */}
      {message.tools?.map((tool) => (
        <ToolCallDisplay key={tool.id} tool={tool} />
      ))}

      {/* Main content */}
      <MessageResponse>
        {streamedContent}
      </MessageResponse>
    </div>
  );
}
```

### 3. AgentSidebar (Session List)

**File:** `apps/frontend/src/features/agents/components/AgentSidebar.tsx`

```typescript
import { Button } from "@/components/ui/button";
import { PlusIcon, XIcon } from "lucide-react";
import { useAgentSessions, useActiveSessionId } from "../hooks";
import { agentActions } from "../store";

export function AgentSidebar({ projectId }: { projectId: string }) {
  const sessions = useAgentSessions();
  const activeSessionId = useActiveSessionId();

  const handleNewSession = () => {
    agentActions.createSession(projectId, `Session ${sessions.length + 1}`);
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/50">
      <div className="flex items-center justify-between border-b p-3">
        <h3 className="font-medium">Sessions</h3>
        <Button variant="ghost" size="icon" onClick={handleNewSession}>
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {sessions.map((session) => (
          <SessionListItem
            key={session.id}
            session={session}
            isActive={session.id === activeSessionId}
            onSelect={() => agentActions.selectSession(session.id)}
            onClose={() => agentActions.closeSession(session.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

## Styling Notes

AI Elements uses shadcn/ui conventions - components accept standard className:

```typescript
<Conversation className="h-full flex-col">
<ConversationContent className="scroll-smooth space-y-4">
<Message className="group animate-in fade-in">
<MessageContent className="prose dark:prose-invert">
```

## Files to Create
- `apps/frontend/src/features/agents/components/AgentChat.tsx`
- `apps/frontend/src/features/agents/components/AgentMessageContent.tsx`
- `apps/frontend/src/features/agents/components/AgentSidebar.tsx`
- `apps/frontend/src/features/agents/components/SessionListItem.tsx`
- `apps/frontend/src/features/agents/components/index.ts` (barrel export)

## Files to Modify
- `apps/frontend/src/features/agents/index.ts` - export components
- `apps/frontend/src/styles.css` - ensure prose styles available

## Testing
- [ ] Conversation renders with Message components
- [ ] PromptInput submit triggers action
- [ ] Streaming content updates in real-time
- [ ] Scroll button appears when content overflows
- [ ] Session switching works correctly

## Dependencies on Phase 4
- Uses store from Phase 4
- Uses hooks from Phase 4

## Out of Scope
- No tool call display yet (Phase 6)
- No page/route setup yet (Phase 7)
- No reasoning visualization yet (Phase 6)
