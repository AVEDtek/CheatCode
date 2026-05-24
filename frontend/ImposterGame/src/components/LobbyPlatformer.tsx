import { useEffect, useRef, useState } from "react";
import { useRoom } from "../contexts/RoomContext.tsx";

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
};

type GoalState = {
    x: number;
    y: number;
};

const WORLD_WIDTH = 320;
const WORLD_HEIGHT = 180;
const PLAYER_SIZE = 12;
const GOAL_SIZE = 10;

const PLATFORMS: Platform[] = [
    { x: 0, y: 164, w: 320, h: 16 },
    { x: 36, y: 136, w: 74, h: 10 },
    { x: 132, y: 108, w: 66, h: 10 },
    { x: 218, y: 82, w: 74, h: 10 },
];

const INITIAL_PLAYER: PlayerState = {
    x: 18,
    y: 152,
    vx: 0,
    vy: 0,
    grounded: true,
    won: false,
};

const INITIAL_GOAL: GoalState = {
    x: 288,
    y: 70,
};

export default function LobbyPlatformer() {
    const { players, capacity, hostId, username } = useRoom();
    const effectiveHost = hostId || players[0];

    const [playerScore, setPlayerScore] = useState(0);
    const [player, setPlayer] = useState<PlayerState>(INITIAL_PLAYER);
    const [goal, setGoal] = useState<GoalState>(INITIAL_GOAL);

    const stateRef = useRef<PlayerState>(INITIAL_PLAYER);
    const goalRef = useRef<GoalState>(INITIAL_GOAL);
    const keysRef = useRef({
        left: false,
        right: false,
        jump: false,
    });
    const frameRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);

    const syncState = (nextState: PlayerState) => {
        stateRef.current = nextState;
        setPlayer(nextState);
    };

    const randomGoal = (): GoalState => ({
        x: Math.floor(Math.random() * (WORLD_WIDTH - GOAL_SIZE)),
        y: Math.floor(Math.random() * (WORLD_HEIGHT - GOAL_SIZE)),
    });

    const moveGoal = () => {
        const nextGoal = randomGoal();
        goalRef.current = nextGoal;
        setGoal(nextGoal);
        setPlayerScore((score) => score + 1);
    };

    const resetGame = () => {
        const resetState = { ...INITIAL_PLAYER };
        stateRef.current = resetState;
        goalRef.current = INITIAL_GOAL;
        keysRef.current.jump = false;
        lastTimeRef.current = null;
        setPlayer(resetState);
        setGoal(INITIAL_GOAL);
    };

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const key = event.key.toLowerCase();

            if (key === "arrowleft" || key === "a") {
                keysRef.current.left = true;
            }

            if (key === "arrowright" || key === "d") {
                keysRef.current.right = true;
            }

            if (event.code === "Space" || key === "arrowup" || key === "w") {
                keysRef.current.jump = true;
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

            if (event.code === "Space" || key === "arrowup" || key === "w") {
                keysRef.current.jump = false;
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

            const gravity = 1800;
            const jumpVelocity = 560;
            const maxSpeed = 180;

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

            const previousX = nextX;
            const previousY = nextY;

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

                const previousBottom = previousY + PLAYER_SIZE;
                const currentBottom = nextY + PLAYER_SIZE;
                const previousTop = previousY;
                const currentTop = nextY;
                const previousRight = previousX + PLAYER_SIZE;
                const currentRight = nextX + PLAYER_SIZE;
                const previousLeft = previousX;

                if (previousBottom <= platform.y && currentBottom >= platform.y) {
                    nextY = platform.y - PLAYER_SIZE;
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

            if (nextY + PLAYER_SIZE >= WORLD_HEIGHT) {
                nextY = WORLD_HEIGHT - PLAYER_SIZE;
                nextVy = 0;
                grounded = true;
            }

            const playerCenterX = nextX + PLAYER_SIZE / 2;
            const playerCenterY = nextY + PLAYER_SIZE / 2;
            const currentGoal = goalRef.current;
            const goalCenterX = currentGoal.x + GOAL_SIZE / 2;
            const goalCenterY = currentGoal.y + GOAL_SIZE / 2;
            const reachedGoal = Math.hypot(playerCenterX - goalCenterX, playerCenterY - goalCenterY) < 10;

            if (reachedGoal) {
                moveGoal();
            }

            syncState({
                x: nextX,
                y: nextY,
                vx: nextVx,
                vy: nextVy,
                grounded,
                won: reachedGoal,
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

            <p className="mt-2 text-[11px] text-gray-400">Move with WASD or arrows. Jump with Space.</p>

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

                <div
                    className={`absolute rounded-full transition-colors duration-150 ${player.won ? "bg-green-300 shadow-[0_0_20px_rgba(134,239,172,0.8)]" : "bg-purple-300 shadow-[0_0_20px_rgba(192,132,252,0.7)]"}`}
                    style={{
                        left: `${(player.x / WORLD_WIDTH) * 100}%`,
                        top: `${(player.y / WORLD_HEIGHT) * 100}%`,
                        width: `${(PLAYER_SIZE / WORLD_WIDTH) * 100}%`,
                        height: `${(PLAYER_SIZE / WORLD_HEIGHT) * 100}%`,
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
