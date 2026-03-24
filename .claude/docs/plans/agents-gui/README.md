# Agents GUI Implementation Plans

Design doc: `agents-gui-design.md`

## Phases (each is a single jj commit)

| Phase | File | Description | Est. Time |
|-------|------|-------------|-----------|
| 1 | `01-deps-installation.md` | Install pi SDK and AI Elements | 15 min |
| 2 | `02-backend-agent-service.md` | AgentManager Effect service | 2-3 hrs |
| 3 | `03-backend-websocket-handler.md` | WebSocket bidirectional streaming | 2 hrs |
| 4 | `04-frontend-agent-store.md` | TanStack Store + WebSocket client | 2 hrs |
| 5 | `05-frontend-chat-components.md` | AI Elements chat UI | 2-3 hrs |
| 6 | `06-frontend-tool-display.md` | Inline tool call visualization | 2 hrs |
| 7 | `07-frontend-routes-pages.md` | Routes and AgentsPage | 1-2 hrs |
| 8 | `08-integration-end-to-end.md` | Full integration, testing, polish | 2-3 hrs |

## Total: ~16-20 hours

## Getting Started

1. Read the design doc first: `agents-gui-design.md`
2. Start with Phase 1, work through sequentially
3. Each phase builds on the previous
4. Run tests after each phase

## Prerequisites

- Familiar with Effect-TS patterns (see skill: `effect-best-practices`)
- Familiar with pi SDK (see pi docs: `docs/sdk.md`)
- Familiar with AI Elements (see: https://elements.ai-sdk.dev)

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Bun, Effect-TS, oRPC, pi SDK |
| Frontend | React, TanStack Router/Store, AI Elements, streamdown |
| Shared | Effect Schema |
