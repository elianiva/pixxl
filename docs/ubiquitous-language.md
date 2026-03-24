# Ubiquitous Language

Domain terms used throughout pixxl. Use these terms consistently in code, UI, and documentation.

---

## Core Concepts

| Term          | Definition                                                                       | Aliases (Don't Use)              |
| ------------- | -------------------------------------------------------------------------------- | -------------------------------- |
| **Workspace** | The container for all projects, settings, and application state                  | root, collection                 |
| **Project**   | A code repository or directory containing files, terminals, agents, and commands | folder, directory, repo          |
| **Agent**     | An AI entity configured to operate within a project's context                    | AI, bot, assistant, copilot, llm |
| **Terminal**  | A persistent shell session tied to a specific project                            | shell, console, session, tab     |
| **Command**   | A named, reusable shell command stored in a project                              | script, task, macro, shortcut    |
| **Config**    | Application-wide settings                                                        | settings, preferences, options   |

---

## Project

| Term                | Definition                                             | Aliases (Don't Use)      |
| ------------------- | ------------------------------------------------------ | ------------------------ |
| **Project Path**    | Absolute filesystem path to the project root directory | root, dir, location      |
| **Project Name**    | Normalized identifier derived from directory name      | id, slug, key            |
| **Recent Projects** | List of projects sorted by last access time            | history, recent, recents |

---

## Agent

| Term               | Definition                                   | Aliases (Don't Use)    |
| ------------------ | -------------------------------------------- | ---------------------- |
| **Agent Name**     | Human-readable label for the agent           | label, title, display  |
| **Agent Provider** | LLM backend service (anthropic, openai, etc) | service, backend, api  |
| **Agent Model**    | Specific model version used by the agent     | version, engine        |
| **Max Tokens**     | Upper bound on response length               | limit, length, size    |
| **Temperature**    | Sampling randomness parameter (0-1)          | randomness, creativity |

---

## Terminal

| Term                  | Definition                                               | Aliases (Don't Use)   |
| --------------------- | -------------------------------------------------------- | --------------------- |
| **Terminal Name**     | Human-readable label for the terminal                    | label, title          |
| **Shell**             | Executable path for the terminal process (/bin/zsh, etc) | shellPath, executable |
| **Working Directory** | Current directory of the terminal process                | cwd, currentDir       |

---

## Command

| Term                    | Definition                                    | Aliases (Don't Use)   |
| ----------------------- | --------------------------------------------- | --------------------- |
| **Command Name**        | Human-readable label for the command          | label, title, display |
| **Command String**      | The actual shell command text to execute      | script, text, value   |
| **Command Description** | Optional explanation of what the command does | desc, help, info      |

---

## Config

| Term                 | Definition                               | Aliases (Don't Use)    |
| -------------------- | ---------------------------------------- | ---------------------- |
| **Workspace Config** | Project management settings              | workspace settings     |
| **Terminal Config**  | Default terminal settings                | terminal settings      |
| **Agent Config**     | Default agent parameters                 | agent settings         |
| **Auto Save**        | Whether to persist changes automatically | autosave, auto-persist |

---

## Errors

| Term              | Definition                             | Aliases (Don't Use) |
| ----------------- | -------------------------------------- | ------------------- |
| **Error Code**    | Machine-readable error identifier      | code, errorId       |
| **Error Feature** | Domain module that generated the error | module, source      |
