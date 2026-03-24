# Phase 1: Dependencies Installation

## Goal
Install required dependencies for pi SDK integration and AI Elements UI components.

## Dependencies

### Backend (apps/backend/)
```bash
# pi SDK for agent functionality
vp add @mariozechner/pi-coding-agent

# WebSocket support (if not already present)
# ws is typically built into Bun, no additional package needed
```

### Frontend (apps/frontend/)
```bash
# AI Elements from Vercel
vp add ai-elements

# streamdown.ai for markdown streaming
vp add streamdown

# Shiki for syntax highlighting (comes with AI Elements but ensure it's there)
# already included via ai-elements
```

### Shared (packages/shared/)
```bash
# Types/contracts for agent communication
# No new deps - use existing Effect Schema
```

## Verification Steps
- [ ] Run `vp install` successfully
- [ ] Import `createAgentSession` from `@mariozechner/pi-coding-agent` in backend
- [ ] Import `Conversation`, `Message`, `PromptInput` from `ai-elements` in frontend
- [ ] Verify no TypeScript errors
- [ ] Run `vp check` passes

## Files to Modify
- `apps/backend/package.json` - add pi SDK
- `apps/frontend/package.json` - add ai-elements, streamdown
- `pnpm-workspace.yaml` - ensure hoisting rules if needed

## Out of Scope
- No code changes, just dependency installation
- No configuration yet
