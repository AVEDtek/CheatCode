# AWS Run Guide (Simple)

This file only covers how to run backend and frontend.

## Run Backend

```bash
cd /home/ubuntu/ImposterGame
source backend/.venv/bin/activate
python3 -m backend.server
```

Backend runs on port `8765`.

## Run Frontend

Open a second terminal:

```bash
cd /home/ubuntu/ImposterGame/frontend/ImposterGame
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Frontend runs on port `5173`.

## Open In Browser

Use:

```text
http://YOUR_EC2_PUBLIC_IP:5173
```

## Stop

- Backend: `Ctrl+C`
- Frontend: `Ctrl+C`
