import { useEffect, useMemo, useRef, useState } from "react"
import { useSocket } from "../contexts/SocketContext.tsx";

type LobbyMiniGameProps = {
    roomId: string;
    playerId: string;
    width?: number;
    height?: number;
}

type LobbyPlayer = {
    playerId: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    updatedAt: number;
};

export default function LobbyMiniGame({
    roomId,
    playerId,
    width = 800,
    height = 500
}: LobbyMiniGameProps) {
    const { send, onMessage, isConnected } = useSocket();

    // authoritative snapshot from server keyed by playerId
    const [players, setPlayers] = useState<Record<string, LobbyPlayer>>({});

    // local prediction for immediate movement responsiveness
    const [localPos, setLocalPos] = useState({ x: 120, y: 120});

    // track key states while pressed
    const keysRef = useRef<Record<string, boolean>>({});

    // Store RAF id for proper cleanup
    const rafRef = useRef<number | null>(null);

    // throttle websocket sends so movement updates are not spammy
    const lastSendRef = useRef(0);

    const speed = 220; // px/s

    useEffect(() => {
        // wait until socket + room/player identity is available
        if (!isConnected || !roomId || !playerId) return;

        // ask server for current mini-game snapshot
        send({ type: "lobby-init", roomId, playerId});

        const unsubState = onMessage("lobby-state", (data) => {
            const map: Record<string, LobbyPlayer> = {};
            for (const p of data.players as LobbyPlayer[]) {
                map[p.playerId] = p;
            }
            setPlayers(map);

            // keep local prediction synced to server for current user
            if (map[playerId]) {
                setLocalPos({ x: map[playerId].x, y: map[playerId].y});
            }
        });

            const unsubLeft = onMessage("lobby-player-left", (data) => {
                setPlayers((prev) => {
                    const next = { ...prev };
                    delete next[data.playerId];
                    return next;
                });
                });

             return () => {
                unsubState();
                unsubLeft();
                };
            }, [isConnected, roomId, playerId, send, onMessage]);

    useEffect(() => {
        // handle keyboard events for movement
        const onKeyDown = (e: KeyboardEvent) => {keysRef.current[e.key.toLowerCase()] = true;}
        const onKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key.toLowerCase()] = false; }
        window.addEventListener("keydown", onKeyDown)
        window.addEventListener("keyup", onKeyUp)
        return () => {
            window.removeEventListener("keydown", onKeyDown)
            window.removeEventListener("keyup", onKeyUp)
        }
    }, [])

    useEffect(() => {
        let last = performance.now();
        
        const tick = (now: number) => {
            const dt = (now - last) / 1000;
            last = now;

            let dx = 0;
            let dy = 0;
            const k = keysRef.current

            // support both WASD and arrow keys
            if (k["w"] || k["arrowup"]) dy -= 1;
            if (k["s"] || k["arrowdown"]) dy += 1;
            if (k["a"] || k["arrowleft"]) dx -= 1;
            if (k["d"] || k["arrowright"]) dx += 1;

            if (dx !== 0 || dy !== 0) {
                // normalize diagonal movement
                const mag = Math.hypot(dx, dy) || 1;
                const vx = (dx / mag) * speed;
                const vy = (dy / mag) * speed;

                setLocalPos((prev) => {
                    // local clamp so movement feels immediate and stays visible
                    const nx = Math.max(16, Math.min(width - 16, prev.x + vx * dt));
                    const ny = Math.max(16, Math.min(height - 16, prev.y + vy * dt));
                    
                    // send to server at 12.5 updates/sec
                    const elapsed = now - lastSendRef.current;
                    if (elapsed > 80 && isConnected) {
                        send({
                            type: "lobby-move",
                            roomId,
                            playerId,
                            x: nx,
                            y: ny,
                            vx,
                            vy,
                            seq: Math.floor(now)
                        })
                        lastSendRef.current = now
                    }
                    return { x: nx, y: ny}
                })
            }

            rafRef.current = requestAnimationFrame(tick);
        }

        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        }
    }, [height, width, roomId, playerId, isConnected, send])

    // convert map to renderable list
    const playerList = useMemo(() => Object.values(players), [players]);

    return(
        <div className="rounded-2xl border-2 border-gray-700 bg-brand-gray p-3">
      <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">
        Lobby Mini Game
      </p>
      <div
        className="relative rounded-xl border border-gray-700 bg-brand-gray-light/50 overflow-hidden"
        style={{ width: "100%", aspectRatio: "16 / 10" }}
      >
        {playerList.map((p) => {
          const isMe = p.playerId === playerId;
          return (
            <div
              key={p.playerId}
              className="absolute"
              style={{
                left: `${(p.x / width) * 100}%`,
                top: `${(p.y / height) * 100}%`,
                transform: "translate(-50%, -50%)"
              }}
            >
              <div
                className="w-7 h-7 rounded-full border-2"
                style={{
                  backgroundColor: p.color,
                  borderColor: isMe ? "#ffffff" : "rgba(255,255,255,0.25)"
                }}
              />
              <p className="mt-1 text-[10px] text-gray-200 text-center whitespace-nowrap">
                {isMe ? "You" : p.playerId}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-gray-500">
        Move with WASD or arrow keys
      </p>
    </div>
  );
    

}