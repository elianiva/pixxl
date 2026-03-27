# Agent Effect Design

## Problem statement

Current agent chat flow relies on TanStack DB `createEffect(... onEnter)` over a local interactions collection. Behavior is janky: user message insertions can retrigger prompt sends, mode handling is implicit, and collection refetch/stream coupling is fragile.

## Goals

- Understand current end-to-end message flow
- Identify root architectural issues, not patch symptoms
- Propose a cleaner, more deterministic pattern
- Preserve optimistic UI + streaming UX

## Known requirements

- Frontend: React + TanStack Start + TanStack DB
- Backend: Bun + Effect-TS + actor-based agent runtime
- Need local-first-ish chat UX with optimistic user messages and streamed assistant output
- Need support for immediate / steer / followUp modes

## Open questions

- Should prompting remain collection-driven, or move to explicit mutation/action flow?
- What source of truth should own optimistic + persisted entries?
- How should queued modes appear in UI without triggering sends?
