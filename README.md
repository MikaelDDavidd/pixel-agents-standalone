<div align="center">

# Pixel Agents Standalone

**Watch your Claude Code agents work as pixel characters — in any browser, from any terminal.**

A standalone Node.js server that ports the [Pixel Agents](https://github.com/pablodelucca/pixel-agents) VS Code extension out of VS Code, so your agents stay visible whether you run Claude Code from Warp, iTerm, Hyper, or the native Terminal.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com)
[![WebSocket](https://img.shields.io/badge/WebSocket-ws%208.18-010101?logo=socketdotio&logoColor=white)](https://github.com/websockets/ws)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey)]()

</div>

---

## Overview

The original [Pixel Agents](https://github.com/pablodelucca/pixel-agents) VS Code extension turns your Claude Code agents into animated pixel characters working in a virtual office. The catch: it only sees agents launched from VS Code's integrated terminal.

**Pixel Agents Standalone** removes that constraint. It runs as a local server that scans `~/.claude/projects/` for active session transcripts — regardless of which terminal spawned them — and streams the same React webview to your browser over WebSocket. The pixel office, furniture editor, and character animations are unchanged; only the transport layer is replaced.

If you live in Warp or iTerm but still want the dopamine hit of watching tiny developers code for you, this is for you.

### Key Features

- **Terminal-agnostic detection** — Picks up Claude Code sessions from Warp, iTerm, Hyper, native Terminal, or any tool that writes to `~/.claude/projects/`
- **Browser-native** — Open `http://localhost:3333` in any browser, on any OS
- **Auto-discovery** — Scans every 5 seconds; new sessions appear within a few moments of starting
- **Same office, same agents** — Reuses the original extension's pixel art, sprites, furniture, and rendering engine
- **Shared layout** — Reads and writes `~/.pixel-agents/layout.json`, so your office layout stays in sync with the VS Code extension
- **Multi-tab support** — Open the office in as many tabs as you like; all stay live via WebSocket broadcast
- **Zero cloud, zero account** — Everything runs locally over `localhost`

## How It Works

```
┌─────────────────────────┐         ┌──────────────────────┐
│  Any terminal           │         │  Browser             │
│  (Warp / iTerm / ...)   │         │  http://localhost:   │
│                         │         │  3333                │
│  $ claude               │         │                      │
│       │                 │         │   ┌──────────────┐   │
│       ▼                 │         │   │ React webview│   │
│  ~/.claude/projects/    │         │   │ + ws-adapter │   │
│  *.jsonl                │         │   └──────┬───────┘   │
└──────────┬──────────────┘         └──────────┼───────────┘
           │                                   │ WebSocket
           │ scan every 5s                     │
           ▼                                   ▼
       ┌────────────────────────────────────────────┐
       │   Pixel Agents Standalone (Node.js)        │
       │   ┌──────────┐   ┌────────────────────┐    │
       │   │ Scanner  │──▶│ Express + ws       │    │
       │   │ (jsonl)  │   │ broadcasts events  │    │
       │   └──────────┘   └────────────────────┘    │
       └────────────────────────────────────────────┘
```

1. **Scanner** (`src/scanner.js`) — Walks `~/.claude/projects/` looking for `.jsonl` transcript files modified in the last 15 minutes. Parses Claude Code events (`tool_use`, `tool_result`, `turn_duration`, etc.) and emits agent activity.
2. **Server** (`src/server.js`) — Express on port `3333` serves the static React webview and assets (sprites, floors, walls, furniture). A `ws` server broadcasts scanner events to every connected browser.
3. **WS adapter** (`public/ws-adapter.js`) — A tiny shim that replaces VS Code's `acquireVsCodeApi()` with a WebSocket-backed implementation. The webview thinks it's still inside VS Code and just sends/receives messages as usual.

## Tech Stack

- **Runtime**: Node.js 18+ (ES modules)
- **HTTP**: [Express](https://expressjs.com) 4.21
- **Realtime**: [ws](https://github.com/websockets/ws) 8.18 (WebSocket server)
- **Image utilities**: [pngjs](https://github.com/lukeapage/pngjs) 7
- **Frontend**: Reuses the React webview built by the [Pixel Agents](https://github.com/pablodelucca/pixel-agents) VS Code extension

## Getting Started

### Prerequisites

- **Node.js 18+**
- **[Pixel Agents VS Code extension](https://marketplace.visualstudio.com/items?itemName=pablodelucca.pixel-agents)** installed — the build script reuses its compiled webview and assets
- **[Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code)** installed (otherwise there are no sessions to visualize)

### Installation

```bash
git clone git@gitlab.com:mikaeldavidlopes/pixel-agents-standalone.git
cd pixel-agents-standalone
npm install
```

### Build

The build script copies the webview, assets, and ws-adapter into `dist/`:

```bash
node build.js
```

By default it looks for the VS Code extension's compiled output at:

```
/tmp/pixel-agents/dist/webview
/tmp/pixel-agents/dist/assets
```

If you have the extension installed at a different path (typically `~/.vscode/extensions/pablodelucca.pixel-agents-*/dist/`), update the `WEBVIEW_SRC` and `ASSETS_SRC` constants at the top of `build.js`.

### Running

```bash
node dist/server.js
```

Then open **http://localhost:3333** in your browser.

Or use the convenience script that builds and starts in one go:

```bash
bash start.sh
```

## Usage

1. Start the server: `bash start.sh`
2. Open `http://localhost:3333` in your browser.
3. In any terminal, run `claude` and start working.
4. Within a few seconds your agent appears in the pixel office. Open and close as many sessions as you like — each one shows up as its own character.

The furniture editor, layout persistence, and character animations behave exactly as in the VS Code extension. Layout is shared via `~/.pixel-agents/layout.json`, so any rearrangement done here is reflected in the extension and vice versa.

## Project Structure

```
pixel-agents-standalone/
├── build.js              # Copies webview + assets, injects ws-adapter
├── start.sh              # Build + run shortcut
├── package.json
├── public/
│   └── ws-adapter.js     # Replaces acquireVsCodeApi() with WebSocket
├── src/
│   ├── server.js         # Express + WebSocket server (port 3333)
│   ├── scanner.js        # Scans ~/.claude/projects/ every 5s
│   └── inject-adapter.ts # Adapter helper (TS source)
└── dist/                 # Generated by build.js — do not edit
    ├── server.js
    ├── scanner.js
    └── public/           # Webview + assets + ws-adapter.js
```

## Configuration

Most knobs live as constants at the top of `src/server.js` and `src/scanner.js`:

| Constant | Where | Default | Purpose |
|----------|-------|---------|---------|
| `PORT` | `server.js` | `3333` | HTTP + WebSocket port |
| `MAX_AGE_MS` | `scanner.js` | `15 * 60 * 1000` | Ignore session files older than 15 min |
| `CLAUDE_PROJECTS_DIR` | `scanner.js` | `~/.claude/projects` | Where to scan for `.jsonl` transcripts |

## Credits

All pixel art, sprites, furniture, animations, and the React webview itself are the work of [Pablo de Lucca](https://github.com/pablodelucca) and the [pixel-agents](https://github.com/pablodelucca/pixel-agents) project. This standalone port only adds the Node server, the file-system scanner, and the WebSocket adapter that lets the webview run outside VS Code.

## License

Same license as the upstream [Pixel Agents](https://github.com/pablodelucca/pixel-agents/blob/main/LICENSE) project.

---

<div align="center">
Built by <a href="https://github.com/MikaelDDavidd">Mikael David</a>
</div>
