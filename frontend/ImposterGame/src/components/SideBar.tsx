import { useGame } from "../contexts/GameContext.tsx";
import { useEffect, useRef } from "react";
import UserCard from "./UserCard.tsx";

export default function SideBar() {
    const {
        codingTime,
        turnTime,
        players,
        currentPlayer
    } = useGame();

    const CLIP_URL = "/sounds/clockTicking.mp3";
    const PLAY_MS = 5000; //5 seconds

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const stopTimerRef = useRef<number | null>(null);
    const startedForRef = useRef<number | null>(null);

    useEffect(() => {
        audioRef.current = new Audio(CLIP_URL);
        audioRef.current.preload = "auto";

        return () => {
            if (stopTimerRef.current != null) window.clearTimeout(stopTimerRef.current);
            audioRef.current?.pause();
            if (audioRef.current) audioRef.current.currentTime = 0;
        };
    }, []);

    useEffect(() => {
        // start exactly when the countdown reaches 5
        if (turnTime > 5 || turnTime <= 0) {
            startedForRef.current = null;
            return;
        }

        // guard against duplicate starts (re-renders / repeated state)
        if (startedForRef.current === 5) return;
        startedForRef.current = 5;

        const a = audioRef.current;
        if (!a) return;

        if (stopTimerRef.current != null) window.clearTimeout(stopTimerRef.current);

        a.pause();
        a.currentTime = 0;

        a.play().catch(() => {
            // may be blocked until a user gesture (browser autoplay policy)
        });

        stopTimerRef.current = window.setTimeout(() => {
                a.pause();
                a.currentTime = 0;
            }, PLAY_MS);
    }, [turnTime]);

    return (
        <>
            <div className="w-[16%] min-w-[190px] shrink-0 self-start h-fit bg-brand-gray my-3 mr-8 border-2 border-gray-700 rounded-2xl min-h-[85vh] p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-5 bg-purple-600 rounded-full" />
                        <h2 className="text-gray-100 text-sm font-bold uppercase tracking-widest">Round</h2>
                    </div>
                    <div className="rounded-full border border-gray-700 bg-brand-gray-light/40 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gray-400">
                        {Math.floor(codingTime / 60)}:{String(codingTime % 60).padStart(2, "0")}
                    </div>
                </div>

                <div className="rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4">
                    <p className="text-[11px] uppercase tracking-widest font-semibold text-gray-500">Time Until Next Round</p>
                    <strong className="font-bold text-3xl text-white leading-tight tabular-nums">
                        {Math.floor(turnTime / 60)}:{String(turnTime % 60).padStart(2, "0")}
                    </strong>
                    <div className="mt-3 h-1.5 w-full rounded-full bg-gray-700 overflow-hidden">
                        <div
                            className="h-full bg-purple-600 transition-all duration-1000"
                            style={{ width: `${((turnTime % 60) / 30) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between px-1">
                    <p className="text-[11px] uppercase tracking-widest font-semibold text-gray-500">Players</p>
                    <span className="text-xs text-gray-400 bg-gray-800 rounded-full px-2 py-0.5">{players.length}</span>
                </div>

                <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1">
                    {players.map((player, index) => (
                        <UserCard key={index} username={player} highlighted={player === currentPlayer} />
                    ))}
                </div>
            </div>
        </>
    );
}