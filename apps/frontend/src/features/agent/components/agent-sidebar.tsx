"use client";

import { useCallback } from "react";
import { useAgentSessions, useActiveSessionId } from "../hooks";
import { createSession, selectSession, closeSession } from "../store";
import { SessionListItem } from "./session-list-item";
import { Button } from "@/components/ui/button";

export function AgentSidebar() {
  const sessions = useAgentSessions();
  const activeSessionId = useActiveSessionId();

  const handleNewSession = useCallback(() => {
    const name = `Session ${sessions.length + 1}`;
    void createSession({
      name,
      thinkingLevel: "medium",
    });
  }, [sessions.length]);

  const handleSelectSession = useCallback((sessionId: string) => {
    selectSession(sessionId);
  }, []);

  const handleCloseSession = useCallback((sessionId: string) => {
    void closeSession(sessionId);
  }, []);

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="font-medium text-foreground">Sessions</h3>
        <Button variant="ghost" size="icon-xs" onClick={handleNewSession} className="size-6">
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              d="M12 5v14m-7-7h14"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </Button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 rounded-full bg-muted p-2">
              <svg
                className="size-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                />
              </svg>
            </div>
            <p className="mb-2 text-xs font-medium text-foreground">No sessions yet</p>
            <Button variant="outline" size="sm" onClick={handleNewSession} className="h-7 text-xs">
              Create session
            </Button>
          </div>
        ) : (
          <div className="space-y-0.5">
            {sessions.map((session) => (
              <SessionListItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onSelect={() => handleSelectSession(session.id)}
                onClose={() => handleCloseSession(session.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer with model selector */}
      <div className="border-t p-3">
        <div className="flex items-center gap-2">
          <select
            className="h-7 flex-1 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
            defaultValue="gpt-4o"
          >
            <option value="gpt-4o">GPT-4o</option>
            <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
            <option value="gemini-2-flash">Gemini 2 Flash</option>
          </select>
        </div>
      </div>
    </div>
  );
}
