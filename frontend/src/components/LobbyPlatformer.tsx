import { useEffect, useRef, useState } from "react";
import { useRoom } from "../contexts/RoomContext.tsx";
import { useSocket } from "../contexts/SocketContext.tsx";

type Platform = {
    x: number;
    y: number;
    w: number;
    h: number;
};

type PlayerState = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    grounded: boolean;
    won: boolean;
    crouching: boolean;
};

type GoalState = {
    x: number;
    y: number;
};

type RemotePlayer = {
    x: number;
    y: number;
    score: number;
    crouching: boolean;
};

const WORLD_WIDTH = 320;
const WORLD_HEIGHT = 180;
const PLAYER_SIZE = 12;
const PLAYER_HEIGHT = 12;
const PLAYER_CROUCH_HEIGHT = 7;
const GOAL_SIZE = 10;

const PLATFORMS: Platform[] = [
    { x: 0, y: 164, w: 320, h: 16 },
    { x: 36, y: 136, w: 74, h: 10 },
    { x: 132, y: 108, w: 66, h: 10 },
    { x: 218, y: 82, w: 74, h: 10 },
];

const PLAYER_COLORS = [
    "#a78bfa",
    "#34d399",
    "#60a5fa",
    "#f87171",
    "#fbbf24",
    "#f472b6",
    "#2dd4bf",
    "#a3e635",
];

const INITIAL_PLAYER: PlayerState = {
    x: 18,
    y: 152,
    vx: 0,
    vy: 0,
    grounded: true,
    won: false,
    crouching: false,
};

const INITIAL_GOAL: GoalState = {
    x: 240,
    y: 72,
};

export default function LobbyPlatformer() {
    const { players, capacity, hostId, username, roomId } = useRoom();
    const { send, onMessage, isConnected } = useSocket();
    const effectiveHost = hostId || players[0];

    const [playerScore, setPlayerScore] = useState(0);
    const [player, setPlayer] = useState<PlayerState>(INITIAL_PLAYER);
    const [goal, setGoal] = useState<GoalState>(INITIAL_GOAL);
    const [remotePlayers, setRemotePlayers] = useState<Map<string, RemotePlayer>>(new Map());

    const stateRef = useRef<PlayerState>(INITIAL_PLAYER);
    const goalRef = useRef<GoalState>(INITIAL_GOAL);
    const goalVersionRef = useRef(0);
    const goalMovePendingRef = useRef(false);
    const playerScoreRef = useRef(0);
    const remotePlayersRef = useRef<Map<string, RemotePlayer>>(new Map());
    const lastSentPosRef = useRef({ x: INITIAL_PLAYER.x, y: INITIAL_PLAYER.y, crouching: INITIAL_PLAYER.crouching });
    const keysRef = useRef({ left: false, right: false, jump: false, crouch: false });
    const frameRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);

    // Stable refs so the 60 Hz game loop always reads current values
    const sendRef = useRef(send);
    const isConnectedRef = useRef(isConnected);
    const lobbyCtxRef = useRef({ roomId, username });
    useEffect(() => { sendRef.current = send; }, [send]);
    useEffect(() => { isConnectedRef.current = isConnected; }, [isConnected]);
    useEffect(() => { lobbyCtxRef.current = { roomId, username }; }, [roomId, username]);

    const localColor = PLAYER_COLORS[players.indexOf(username) % PLAYER_COLORS.length] ?? PLAYER_COLORS[0];

    const syncState = (nextState: PlayerState) => {
        stateRef.current = nextState;
        setPlayer(nextState);
    };

    const randomGoal = (): GoalState => {
        const surfaces = PLATFORMS.map((p) => ({ x: p.x, y: p.y - GOAL_SIZE, span: p.w - GOAL_SIZE }));
        const totalSpan = surfaces.reduce((sum, s) => sum + s.span, 0);
        let pick = Math.random() * totalSpan;
        for (const surface of surfaces) {
            if (pick < surface.span) {
                return { x: Math.floor(surface.x + pick), y: surface.y };
            }
            pick -= surface.span;
        }
        const last = surfaces[surfaces.length - 1];
        return { x: Math.floor(last.x + Math.random() * last.span), y: last.y };
    };

    const resetGame = () => {
        const resetState = { ...INITIAL_PLAYER };
        stateRef.current = resetState;
        if (!isConnectedRef.current) {
            goalRef.current = INITIAL_GOAL;
            goalVersionRef.current = 0;
            setGoal(INITIAL_GOAL);
        }
        goalMovePendingRef.current = false;
        keysRef.current.jump = false;
        keysRef.current.crouch = false;
        lastTimeRef.current = null;
        setPlayer(resetState);
    };

    // Subscribe to lobby multiplayer messages
    useEffect(() => {
        const unsubGoalUpdate = onMessage("lobby-goal-update", (data) => {
            const next = { x: data.x, y: data.y };
            goalRef.current = next;
            goalVersionRef.current = data.goalVersion;
            goalMovePendingRef.current = false;
            setGoal(next);
        });

        const unsubPlayerPos = onMessage("lobby-player-pos", (data) => {
            remotePlayersRef.current.set(data.playerId, { x: data.x, y: data.y, score: data.score, crouching: !!data.crouching });
            setRemotePlayers(new Map(remotePlayersRef.current));
        });

        return () => {
            unsubGoalUpdate();
            unsubPlayerPos();
        };
    }, [onMessage]);

    // Broadcast local position at 20 Hz
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isConnectedRef.current) return;
            const { roomId: rId, username: uId } = lobbyCtxRef.current;
            if (!rId || !uId) return;
            const { x, y, crouching } = stateRef.current;
            const last = lastSentPosRef.current;
            if (x === last.x && y === last.y && crouching === last.crouching) return;
            lastSentPosRef.current = { x, y, crouching };
            sendRef.current({
                type: "lobby-player-pos",
                roomId: rId,
                playerId: uId,
                x,
                y,
                score: playerScoreRef.current,
                crouching,
            });
        }, 50);
        return () => clearInterval(interval);
    }, []);

    // Game loop
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();

            if (key === "arrowleft" || key === "a") {
                keysRef.current.left = true;
            }

            if (key === "arrowright" || key === "d") {
                keysRef.current.right = true;
            }

            if (key === "arrowup" || key === "w") {
                keysRef.current.jump = true;
                event.preventDefault();
            }

            if (key === "arrowdown" || key === "s") {
                keysRef.current.crouch = true;
                event.preventDefault();
            }

            if (key === "r") {
                resetGame();
            }
        };

        const onKeyUp = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();

            if (key === "arrowleft" || key === "a") {
                keysRef.current.left = false;
            }

            if (key === "arrowright" || key === "d") {
                keysRef.current.right = false;
            }

            if (key === "arrowup" || key === "w") {
                keysRef.current.jump = false;
            }

            if (key === "arrowdown" || key === "s") {
                keysRef.current.crouch = false;
            }
        };

        const step = (time: number) => {
            if (lastTimeRef.current === null) {
                lastTimeRef.current = time;
            }

            const dt = Math.min(0.032, (time - lastTimeRef.current) / 1000);
            lastTimeRef.current = time;

            const current = stateRef.current;
            let nextX = current.x;
            let nextY = current.y;
            let nextVx = current.vx;
            let nextVy = current.vy;
            let grounded = current.grounded;

            const moveLeft = keysRef.current.left;
            const moveRight = keysRef.current.right;
            const jumpPressed = keysRef.current.jump;
            const crouchHeld = keysRef.current.crouch;

            // Crouch is only effective on the ground; releasing it under an
            // overhang keeps the player crouched until there's headroom to stand.
            const prevHeight = current.crouching ? PLAYER_CROUCH_HEIGHT : PLAYER_HEIGHT;
            const restingBottom = current.y + prevHeight;
            let crouching: boolean;
            if (!grounded) {
                crouching = false;
            } else if (crouchHeld) {
                crouching = true;
            } else if (current.crouching) {
                const standingTop = restingBottom - PLAYER_HEIGHT;
                crouching = PLATFORMS.some((platform) => {
                    const overlapsX = current.x < platform.x + platform.w && current.x + PLAYER_SIZE > platform.x;
                    const overlapsY = standingTop < platform.y + platform.h && restingBottom > platform.y;
                    return overlapsX && overlapsY;
                });
            } else {
                crouching = false;
            }

            const playerHeight = crouching ? PLAYER_CROUCH_HEIGHT : PLAYER_HEIGHT;
            // Snapshot the true previous-frame position before the foot-anchor
            // adjustment so ceiling collision uses the real prior head position.
            const previousX = current.x;
            const previousY = current.y;
            // Keep the sprite's feet anchored when its height changes.
            nextY += prevHeight - playerHeight;

            const gravity = 1800;
            const jumpVelocity = 560;
            const maxSpeed = crouching ? 100 : 180;

            if (moveLeft && !moveRight) {
                nextVx = -maxSpeed;
            } else if (moveRight && !moveLeft) {
                nextVx = maxSpeed;
            } else {
                nextVx = 0;
            }

            if (jumpPressed && grounded) {
                nextVy = -jumpVelocity;
                grounded = false;
                keysRef.current.jump = false;
            }

            nextVy += gravity * dt;

            nextX += nextVx * dt;
            nextY += nextVy * dt;

            if (nextX < 0) {
                nextX = 0;
                nextVx = 0;
            }

            if (nextX + PLAYER_SIZE > WORLD_WIDTH) {
                nextX = WORLD_WIDTH - PLAYER_SIZE;
                nextVx = 0;
            }

            grounded = false;

            for (const platform of PLATFORMS) {
                const overlapsX = nextX < platform.x + platform.w && nextX + PLAYER_SIZE > platform.x;
                const overlapsY = nextY < platform.y + platform.h && nextY + PLAYER_SIZE > platform.y;

                if (!overlapsX || !overlapsY) {
                    continue;
                }

                const previousBottom = previousY + prevHeight;
                const currentBottom = nextY + playerHeight;
                const previousTop = previousY;
                const currentTop = nextY;
                const previousRight = previousX + PLAYER_SIZE;
                const currentRight = nextX + PLAYER_SIZE;
                const previousLeft = previousX;

                if (previousBottom <= platform.y && currentBottom >= platform.y) {
                    nextY = platform.y - playerHeight;
                    nextVy = 0;
                    grounded = true;
                } else if (previousTop >= platform.y + platform.h && currentTop <= platform.y + platform.h) {
                    nextY = platform.y + platform.h;
                    nextVy = 0;
                } else if (previousRight <= platform.x && currentRight >= platform.x) {
                    nextX = platform.x - PLAYER_SIZE;
                    nextVx = 0;
                } else if (previousLeft >= platform.x + platform.w && nextX <= platform.x + platform.w) {
                    nextX = platform.x + platform.w;
                    nextVx = 0;
                }
            }

            if (nextY + playerHeight >= WORLD_HEIGHT) {
                nextY = WORLD_HEIGHT - playerHeight;
                nextVy = 0;
                grounded = true;
            }

            const playerCenterX = nextX + PLAYER_SIZE / 2;
            const playerCenterY = nextY + playerHeight / 2;
            const currentGoal = goalRef.current;
            const goalCenterX = currentGoal.x + GOAL_SIZE / 2;
            const goalCenterY = currentGoal.y + GOAL_SIZE / 2;
            const reachedGoal = Math.hypot(playerCenterX - goalCenterX, playerCenterY - goalCenterY) < 10;

            if (reachedGoal && !goalMovePendingRef.current) {
                if (isConnectedRef.current) {
                    goalMovePendingRef.current = true;
                    playerScoreRef.current++;
                    setPlayerScore(playerScoreRef.current);
                    const { roomId: rId, username: uId } = lobbyCtxRef.current;
                    sendRef.current({
                        type: "lobby-goal-reached",
                        roomId: rId,
                        playerId: uId,
                        goalVersion: goalVersionRef.current,
                    });
                } else {
                    const nextGoal = randomGoal();
                    goalRef.current = nextGoal;
                    setGoal(nextGoal);
                    playerScoreRef.current++;
                    setPlayerScore(playerScoreRef.current);
                }
            }

            syncState({
                x: nextX,
                y: nextY,
                vx: nextVx,
                vy: nextVy,
                grounded,
                won: reachedGoal,
                crouching,
            });

            frameRef.current = requestAnimationFrame(step);
        };

        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        frameRef.current = requestAnimationFrame(step);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            window.removeEventListener("keyup", onKeyUp);

            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
            }
        };
    }, []);

    return (
        <div className="rounded-xl border border-gray-700 bg-brand-gray-light/30 p-4">
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold">Host</p>
                    <p className="mt-1 text-gray-100 font-semibold truncate">{effectiveHost}</p>
                </div>
                <div className="shrink-0 text-right">
                    <p className="text-gray-500 text-xs uppercase tracking-widest font-semibold">Capacity</p>
                    <p className="mt-1 text-gray-300 text-sm">{capacity} players</p>
                </div>
            </div>

            <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-widest text-gray-500 font-semibold">
                    <span>Lobby Fill</span>
                    <span>{players.length}/{capacity}</span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-700">
                    <div
                        className="h-full rounded-full bg-purple-600 transition-all duration-300"
                        style={{ width: `${capacity > 0 ? (players.length / capacity) * 100 : 0}%` }}
                    />
                </div>
            </div>

            <p className="mt-2 text-[11px] text-gray-400">Move with WASD or arrows. Jump with W or up arrow. Crouch with S or down arrow.</p>

            <div
                className="relative mt-2 w-full overflow-hidden rounded-xl border border-gray-700 bg-[linear-gradient(180deg,#111827_0%,#0b1220_60%,#060b14_100%)]"
                style={{ aspectRatio: "16 / 9" }}
            >
                {PLATFORMS.map((platform, index) => (
                    <div
                        key={index}
                        className="absolute rounded-full bg-gray-600/90 shadow-[0_0_0_1px_rgba(255,255,255,0.04)]"
                        style={{
                            left: `${(platform.x / WORLD_WIDTH) * 100}%`,
                            top: `${(platform.y / WORLD_HEIGHT) * 100}%`,
                            width: `${(platform.w / WORLD_WIDTH) * 100}%`,
                            height: `${(platform.h / WORLD_HEIGHT) * 100}%`,
                        }}
                    />
                ))}

                <div
                    className="absolute rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.7)]"
                    style={{
                        left: `${(goal.x / WORLD_WIDTH) * 100}%`,
                        top: `${(goal.y / WORLD_HEIGHT) * 100}%`,
                        width: `${(GOAL_SIZE / WORLD_WIDTH) * 100}%`,
                        height: `${(GOAL_SIZE / WORLD_HEIGHT) * 100}%`,
                    }}
                    aria-hidden="true"
                />

                {players.filter((p) => p !== username).map((playerId) => {
                    const remote = remotePlayers.get(playerId);
                    if (!remote) return null;
                    const color = PLAYER_COLORS[players.indexOf(playerId) % PLAYER_COLORS.length];
                    return (
                        <div key={playerId}>
                            <div
                                className="absolute rounded-full"
                                style={{
                                    backgroundColor: color,
                                    boxShadow: `0 0 14px ${color}b3`,
                                    left: `${(remote.x / WORLD_WIDTH) * 100}%`,
                                    top: `${(remote.y / WORLD_HEIGHT) * 100}%`,
                                    width: `${(PLAYER_SIZE / WORLD_WIDTH) * 100}%`,
                                    height: `${((remote.crouching ? PLAYER_CROUCH_HEIGHT : PLAYER_HEIGHT) / WORLD_HEIGHT) * 100}%`,
                                }}
                                aria-hidden="true"
                            />
                            <div
                                className="absolute z-10 pointer-events-none flex flex-col items-center"
                                style={{
                                    left: `${((remote.x + PLAYER_SIZE / 2) / WORLD_WIDTH) * 100}%`,
                                    top: `${(remote.y / WORLD_HEIGHT) * 100}%`,
                                    transform: "translate(-50%, calc(-100% - 3px))",
                                }}
                            >
                                <span className="text-[8px] font-semibold leading-tight whitespace-nowrap text-gray-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{playerId}</span>
                                <span className="text-[7px] leading-tight text-gray-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{remote.score}</span>
                            </div>
                        </div>
                    );
                })}

                <div
                    className="absolute rounded-full transition-shadow duration-150"
                    style={{
                        backgroundColor: localColor,
                        boxShadow: player.won
                            ? `0 0 24px ${localColor}, 0 0 8px ${localColor}`
                            : `0 0 14px ${localColor}b3`,
                        left: `${(player.x / WORLD_WIDTH) * 100}%`,
                        top: `${(player.y / WORLD_HEIGHT) * 100}%`,
                        width: `${(PLAYER_SIZE / WORLD_WIDTH) * 100}%`,
                        height: `${((player.crouching ? PLAYER_CROUCH_HEIGHT : PLAYER_HEIGHT) / WORLD_HEIGHT) * 100}%`,
                    }}
                    aria-hidden="true"
                />

                <div
                    className="absolute z-10 pointer-events-none flex flex-col items-center"
                    style={{
                        left: `${((player.x + PLAYER_SIZE / 2) / WORLD_WIDTH) * 100}%`,
                        top: `${(player.y / WORLD_HEIGHT) * 100}%`,
                        transform: "translate(-50%, calc(-100% - 3px))",
                    }}
                >
                    <span className="text-[8px] font-semibold leading-tight whitespace-nowrap text-gray-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{username}</span>
                    <span className="text-[7px] leading-tight text-gray-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{playerScore}</span>
                </div>
            </div>
        </div>
    );
}
