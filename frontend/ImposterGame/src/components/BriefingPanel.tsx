import { useSocket } from "../contexts/SocketContext.tsx";
import { useRoom } from "../contexts/RoomContext.tsx";
import { useGame } from "../contexts/GameContext.tsx";

import { useState } from "react";

export default function BriefingPanel() {
    const { send, isConnected } = useSocket();
    const { roomId, username } = useRoom();
    const {
        briefingTime,
        players,
        readyCount,
        problem,
        imposter
    } = useGame();

    const [isBriefingOpen, setIsBriefingOpen] = useState<boolean>(true);
    const [isReady, setIsReady] = useState<boolean>(false);

    function handleCloseBriefing() {
        if (!isConnected) {
            console.error("Socket not connected");
            return;
        }

        setIsBriefingOpen(false);
        setIsReady(true);

        const request = {
            type: "set-ready",
            roomId: roomId,
            playerId: username
        };
        send(request);
    }

    if (!problem || problem.title === "" || problem.description === "" || problem.difficulty === "") {
        return null;
    }

    const difficultyStyle = problem.difficulty === "Easy"
        ? "bg-green-500/20 text-green-300 border-green-500/30"
        : problem.difficulty === "Medium"
            ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
            : "bg-red-500/20 text-red-300 border-red-500/30";

    return (
        <>
            <div className="fixed inset-0 z-40 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                {isBriefingOpen && (
                    <div className="relative z-50 mx-4 w-full max-w-4xl rounded-3xl border border-gray-700 bg-brand-gray shadow-xl overflow-hidden">
                        <div className="border-b border-gray-700 px-6 py-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-5 bg-purple-600 rounded-full" />
                                    <h2 className="text-sm font-bold uppercase tracking-widest text-gray-100">Briefing</h2>
                                </div>
                                <div className="rounded-full border border-gray-700 bg-brand-gray-light/40 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gray-400">
                                    {briefingTime}s
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="min-w-0">
                                {username === imposter ? (
                                    <div className="space-y-4">
                                        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-6 text-center">
                                            <p className="text-xs uppercase tracking-widest font-semibold text-red-300">Role</p>
                                            <h2 className="mt-1 text-2xl font-bold text-red-200">You are the Imposter</h2>
                                            <p className="mt-2 text-sm text-gray-400">
                                                Blend in, gather clues, and avoid getting voted out.
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4">
                                            <p className="mb-2 text-xs uppercase tracking-widest font-semibold text-gray-500">Mission</p>
                                            <p className="text-sm leading-relaxed text-gray-300">
                                                Speak confidently, ask smart questions, and mirror the group to stay under the radar.
                                            </p>
                                        </div>

                                        <div className="rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4">
                                            <p className="mb-3 text-xs uppercase tracking-widest font-semibold text-gray-500">Hints</p>
                                            <div className="flex flex-wrap gap-2">
                                                {(problem.topics ?? []).map((topic: string, index: number) => (
                                                    <span
                                                        key={index}
                                                        className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200"
                                                    >
                                                        {topic}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <h1 className="text-2xl font-bold leading-tight text-gray-100">
                                                {problem.title}
                                            </h1>
                                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${difficultyStyle}`}>
                                                {problem.difficulty}
                                            </span>
                                        </div>

                                        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1 text-gray-300 custom-scrollbar">
                                            {/* <div className="rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4"> */}
                                            <p className="leading-relaxed">{problem.description}</p>
                                            {/* </div> */}

                                            <div className="space-y-3">
                                                {problem.examples.map((example: string, index: number) => (
                                                    <div key={index}>
                                                        <p className="mb-1 text-sm font-semibold text-gray-300">Example {index + 1}</p>
                                                        <pre className="rounded-xl border border-gray-700 bg-brand-gray-light p-3 whitespace-pre-wrap text-sm font-mono text-gray-300">
                                                            {example}
                                                        </pre>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4">
                                                <p className="mb-2 text-xs uppercase tracking-widest font-semibold text-gray-500">Constraints</p>
                                                <ul className="list-disc space-y-1 pl-5">
                                                    {problem.constraints.map((constraint: string, index: number) => (
                                                        <li key={index} className="text-sm text-gray-400">
                                                            {constraint}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end border-t border-gray-700 px-6 py-4 bg-brand-gray">
                            <button
                                type="button"
                                onClick={handleCloseBriefing}
                                className="cursor-pointer rounded-xl bg-purple-700 px-5 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-purple-600 active:scale-95"
                            >
                                Ready
                            </button>
                        </div>
                    </div>
                )}

                {isReady && (
                    <div className="relative z-50 mx-4 w-full max-w-md rounded-3xl border border-gray-700 bg-brand-gray px-6 py-7 text-center shadow-xl">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Stand By</p>
                        <div className="mt-2 inline-block rounded-full border border-gray-700 bg-brand-gray-light/40 px-2 py-1 text-xs font-semibold uppercase tracking-widest text-gray-400">
                            {briefingTime}s
                        </div>
                        <h3 className="mt-2 text-xl font-bold text-gray-100">Waiting for the rest of the room</h3>
                        <p className="mt-2 text-sm text-gray-300">
                            You&rsquo;re ready. Other players still need to dismiss their briefing panel.
                        </p>
                        <div className="mt-5 rounded-xl border border-gray-700 bg-brand-gray-light/40 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Ready Status</p>
                            <p className="mt-1 text-lg font-bold text-gray-100">{readyCount} / {players.length}</p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}