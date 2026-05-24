# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

CheetCode is a real-time multiplayer coding party game (social deduction). Players join a room, take turns writing code against a shared problem, run tests, then vote on who the secretly-assigned imposter is. The backend is a plain-asyncio WebSocket server (no web framework); the frontend is a React 19 + Vite SPA. They communicate exclusively over a single WebSocket using a JSON message protocol.

## Commands

All backend commands run **from the repository root** (the server is imported as a package: `backend.server`).

```bash
# Backend setup
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt

# Run backend (from repo root, venv active) — serves ws://0.0.0.0:8765
python3 -m backend.server

# Frontend
cd frontend
npm install
npm run dev        # Vite dev server, usually http://localhost:5173
npm run build      # tsc -b && vite build  (type-check is part of the build)
npm run lint       # eslint .
npm run preview    # serve the production build
```

There is no automated test suite. "Tests" in this codebase refers to the per-problem unit tests that players' submitted code is executed against during gameplay.

For solo testing, set `MIN_PLAYERS_TO_START=1` and `MIN_PLAYERS_TO_CONTINUE=1` in the root `.env`.

## Environment / configuration

A single `.env` at the **repository root** configures both halves. Vite reads it too — `vite.config.ts` sets `envDir: '../'`, so `VITE_*` vars come from the root `.env`, not from `frontend/`. (`.env.example` is the source of truth for available keys.) Both `.env` files are gitignored.

Backend reads config via `os.getenv` at import time in `server.py` and `game.py` (e.g. `MIN_PLAYERS_TO_START`, `MAX_CODE_LENGTH`, `HOST`/`PORT`). Frontend reads `VITE_BACKEND_URL` (the WebSocket URL) and `VITE_MIN_PLAYERS_TO_START`.

## Architecture

### Wire protocol is the contract

Every frontend↔backend interaction is a JSON message with a `type` field. `backend/jsonProtocol.txt` documents the message shapes and is the canonical reference — **keep it in sync when adding or changing messages.** Wire keys are camelCase (`roomId`, `playerId`, `codingTime`); Python internals are snake_case. When touching messages you almost always edit three places: the backend handler in `server.py`, the `jsonProtocol.txt` doc, and an `onMessage`/`send` call in a frontend context.

### Backend message dispatch (`backend/server.py`)

Handlers register themselves in a `handlers` dict via the `@handler("message-type")` decorator. `websocket_handler` is the per-connection loop: it parses each message, looks up the handler, and calls it. A handler may **return a dict** containing `roomId`/`playerId`; the loop captures these to track which room/player the connection belongs to, so that `handle_disconnect` can clean up correctly when the socket closes. Most handlers follow the same guard pattern: validate required fields → check the room exists → check `game_started()` → check the game is in the expected `GameState`.

### Domain model hierarchy

`RoomManager` (`managers/roomManager.py`) holds all rooms in an in-memory dict keyed by a random 6-char room ID — **all state is in-process and lost on restart**. A `Room` (`models/room.py`) owns its `Player` list and lazily creates one `Game` (`models/game.py`). `Room.broadcast()` fans a JSON message out to every player's websocket via `asyncio.gather`.

### Game state machine (`models/game.py`)

A game moves through `GameState`: `BRIEFING → CODING → VOTING → RESULTS`. Transitions (`set_coding`, `set_voting`, `set_results`) are guarded by an `asyncio.Lock` (`_transition_lock`) plus an idempotency check on the current state, because they can be triggered from multiple concurrent sources (a timer firing vs. all players acting). `Room.game_start_lock` similarly prevents double game creation. On game start, players are shuffled and one is randomly assigned the imposter role; the problem is loaded randomly from `data/problems.json` filtered by difficulty.

Gameplay flow:
- **Briefing**: players `set-ready`; when all are ready (or the briefing timer expires) → coding.
- **Coding**: turn-based on a *shared* editor. The active player's keystrokes broadcast via `new-code`; `next-turn` advances to the next player and rotates `current_player_idx`. A turn ends either when the per-turn timer fires (`turn-over` → client auto-submits `next-turn`) or, if `run-tests` passes **all** tests, the round ends early → voting. `cursor-update` broadcasts the active player's cursor.
- **Voting**: each player `cast-vote`s; when vote count equals player count (or the timer expires) → results. `votedCorrectly` = whether the imposter is among the most-voted players (`get_voted` returns all players tied for max votes).

### Timers (`managers/timeManager.py`)

`TimeManager` runs one asyncio task per phase. Each task loops, decrements a counter, and **broadcasts the remaining time every second** so clients render live countdowns. The coding phase is subdivided into turns: `num_rounds = CODING_DURATION // TURN_DURATION` (turn = 30s). Timers call back into the `Game` to drive transitions when they expire, and `stop_*_timer` cancels the task (awaiting the `CancelledError`) on early transitions.

### Test execution (`managers/testRunner.py`)

`run_tests` first health-checks a remote "CheatCode Engine" at `http://127.0.0.1:8001/status`. If healthy, it POSTs to `/execute` (which returns a `job_id`) and polls `/result/{job_id}` until terminal. If the engine is unreachable/unhealthy, it falls back to `locally_execute_tests`, which writes the submitted code + a generated runner into a temp dir and runs it in a `subprocess` with a timeout. Local fallback is dev-only and can be disabled with `ALLOW_LOCAL_TEST_EXECUTION=false`. The submitted code's first `def` is auto-detected (via `ast`) as the function under test; inputs are spread as `*args`, `**kwargs`, or a single arg depending on shape. The engine itself is a separate service, not part of this repo.

### Frontend (`frontend/`)

React 19 + react-router-dom v7 + Tailwind v4 (CSS-first config via `@theme` in `src/index.css`; brand colors like `brand-black`) + Monaco editor. Three nested context providers (`src/contexts/`) own all shared state:
- **`SocketContext`** — single WebSocket for the app's lifetime. Exposes `send(request)` and `onMessage(type, listener)`, a pub/sub registry that returns an unsubscribe fn. All other contexts/components subscribe through it; nothing else touches the raw socket.
- **`RoomContext`** — lobby state (roomId, username, settings, player list).
- **`GameContext`** — all in-game state, registering one `onMessage` listener per server message type in a single `useEffect`. It also implements **resync**: on mount and on `visibilitychange→visible` it sends `sync-game-state`; the server replies `game-sync` with a full snapshot (phase, timers, players, cursor), so a backgrounded/reconnecting tab catches up.

Pages (`src/pages/`): `Welcome` (create/join) → `Lobby` → `Game`. `Game` renders different panel layouts per `gameState` (coding: SideBar/Problem/Editor; voting & results: VoteSideBar/Problem/Commit). Routing in `App.tsx` wraps `/Lobby` and `/Game` in `RoomProvider`, and `/Game` additionally in `GameProvider`. `vercel.json` rewrites all paths to `index.html` for SPA routing.

## Conventions

- TypeScript is strict with `noUnusedLocals`/`noUnusedParameters`; `npm run build` fails on type errors. Context values are broadly typed with `any` for game payloads — match the surrounding style rather than introducing new shapes ad hoc.
- Backend has no type checker in CI; `models/types.py` defines `TypedDict`s used for documentation/consistency.
- Adding a new server message: register a `@handler`, follow the field-validate → room-exists → game-state guard pattern, update `jsonProtocol.txt`, and add the matching `onMessage`/`send` on the frontend.
