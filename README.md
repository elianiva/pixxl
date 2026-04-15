# pixxl

A Pi-powered code workspace that brings your projects knowledge, terminals, and agents together in one place.

## What is pixxl?

Pixxl is basically a workspace that tries to combine some of the things I use in my development flow. It is heavily inspired by these tools:

- [Soloterm](https://soloterm.com/)
- [T3 Code](https://github.com/pingdotgg/t3code)
- [Cmux](https://cmux.com/)
- [Linear](https://linear.app/)
- [Obsidian](https://obsidian.md/)

The goal of this project is to provide these things integrated into one place:

- Coding Agent, which is a custom GUI that wraps [Pi Coding Agent by Mario Zechner](https://github.com/badlogic/pi-mono)
- Terminal, where I launch [Neovim](https://neovim.io) and do other things, it uses [restty](https://www.npmjs.com/package/restty) for the browser terminal. This is one of my reason why I want to make this app, so that I have all my TUI and GUI all in one place.
- Commands, basically a manager around long-running shell commands so that I can manage them all in one place and expose the logs to the agents.
- Task management, which is basically a Linear clone to manage tasks for me and my agents. This isn't meant to replace Linear that I usually use, this is for local use only with much smaller scope so that I don't forget what I want to do.
- Knowledge base, which is used to store the knowledge of each project that I'm working on. This is also useful to provide agents with context.

## License

Pixxl is licensed under MIT. See [LICENSE](LICENSE) for more information.
