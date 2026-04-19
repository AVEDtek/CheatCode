![CheetCode Logo](CheetCode-Logo.png)

# CheetCode

CheetCode is a real-time multiplayer coding party game inspired by social deduction gameplay.
Players join a room, code in turns, run tests, and vote on who the imposter is.

## Gameplay

1. A player creates a room and chooses settings.
2. Players join the room lobby.
3. The game starts and one player is secretly assigned as the imposter.
4. During coding rounds, players submit code and run tests.
5. In voting, players choose who they believe the imposter is.
6. The round ends with result reveal and winner decision.

## Project Layout

```text
backend/
	server.py                 # WebSocket server and message handling
	data/problems.json        # Problem and test metadata
	managers/                 # Room/game/test/time managers
	models/                   # Core game state models

frontend/ImposterGame/
	src/                      # React app pages, components, and contexts
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm

## Quick Start

### 1. Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file at the project root:

```env
# Remote execution (if used by your setup)
CHEATCODE_ENGINE_API_KEY=your_api_key_here

# Server
HOST=0.0.0.0
PORT=8765

# Game
MIN_PLAYERS_TO_START=3
MIN_PLAYERS_TO_CONTINUE=3

# Limits and toggles
ALLOW_LOCAL_TEST_EXECUTION=true
MAX_WS_MESSAGE_BYTES=65536
MAX_PLAYER_ID_LENGTH=24
MAX_CHAT_MESSAGE_LENGTH=600
MAX_CODE_LENGTH=30000
HEALTH_ENDPOINT_ENABLED=false
```

Run the backend from the repository root:

```bash
source backend/.venv/bin/activate
python3 -m backend.server
```

### 2. Frontend setup

Open a second terminal:

```bash
cd frontend/ImposterGame
npm install
```

Create `frontend/ImposterGame/.env`:

```env
VITE_BACKEND_URL=ws://localhost:8765
VITE_MIN_PLAYERS_TO_START=3
```

Start the frontend:

```bash
npm run dev
```

Open the local URL shown by Vite (usually `http://localhost:5173`).

## Local Testing Tip

For faster solo testing, reduce both minimum player values to `1` in your root `.env`:

```env
MIN_PLAYERS_TO_START=1
MIN_PLAYERS_TO_CONTINUE=1
```

## Notes

- The frontend and backend communicate over WebSockets.
- Message shapes are documented in `backend/jsonProtocol.txt`.
