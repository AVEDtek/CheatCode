import { useEffect, useRef, useState } from "react";

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

const GOAL = {
    x: 288,
    y: 70,
};

export default function LobbyPlatformer() {
    const [player, setPlayer] = useState<PlayerState>(INITIAL_PLAYER);
    const [status, setStatus] = useState<string>("Reach the dot on the top-right.");

    const stateRef = useRef<PlayerState>(INITIAL_PLAYER);
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

    const resetGame = () => {
        const resetState = { ...INITIAL_PLAYER };
        stateRef.current = resetState;
        keysRef.current.jump = false;
        lastTimeRef.current = null;
        setStatus("Reach the dot on the top-right.");
        setPlayer(resetState);
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
            if (stateRef.current.won) {
                frameRef.current = requestAnimationFrame(step);
                return;
            }

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

            const acceleration = 760;
            const gravity = 1800;
            const jumpVelocity = 560;
            const maxSpeed = 180;

            if (moveLeft && !moveRight) {
                nextVx -= acceleration * dt;
            } else if (moveRight && !moveLeft) {
                nextVx += acceleration * dt;
            } else {
                nextVx *= Math.pow(0.001, dt);
            }

            nextVx = Math.max(-maxSpeed, Math.min(maxSpeed, nextVx));

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
            const goalCenterX = GOAL.x + GOAL_SIZE / 2;
            const goalCenterY = GOAL.y + GOAL_SIZE / 2;
            const reachedGoal = Math.hypot(playerCenterX - goalCenterX, playerCenterY - goalCenterY) < 16;

            const nextState = {
                x: nextX,
                y: nextY,
                vx: nextVx,
                vy: nextVy,
                grounded,
                won: reachedGoal,
            };

            if (reachedGoal && !current.won) {
                setStatus("You reached the goal. Press R to play again.");
            }

            syncState(nextState);
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
        <div className="rounded-xl border border-gray-700 bg-brand-gray-light/30 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-widest font-semibold text-gray-500">Mini Platformer</p>
                    <p className="text-[11px] text-gray-400">Move with A/D or arrows. Jump with Space. Reset with R.</p>
                </div>
                <button
                    type="button"
                    onClick={resetGame}
                    className="cursor-pointer rounded-lg border border-gray-700 bg-brand-gray px-2.5 py-1 text-[11px] font-bold text-gray-200 transition-colors duration-200 hover:border-purple-500 hover:text-purple-300"
                >
                    Reset
                </button>
            </div>

            <div
                className="relative w-full overflow-hidden rounded-xl border border-gray-700 bg-[linear-gradient(180deg,#111827_0%,#0b1220_60%,#060b14_100%)]"
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
                        left: `${(GOAL.x / WORLD_WIDTH) * 100}%`,
                        top: `${(GOAL.y / WORLD_HEIGHT) * 100}%`,
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

                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-3 pb-2 text-[10px] uppercase tracking-[0.2em] text-gray-500">
                    <span>{status}</span>
                    <span>{player.won ? "Goal" : player.grounded ? "Grounded" : "Airborne"}</span>
                </div>
            </div>
        </div>
    );
}