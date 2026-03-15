import { useGame } from "../contexts/GameContext.tsx";

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSocket } from "../contexts/SocketContext.tsx";
import { useRoom } from "../contexts/RoomContext.tsx";

import SideBar from "../components/SideBar.tsx";
import VoteSideBar from "../components/VoteSideBar.tsx";
import ProblemPanel from "../components/ProblemPanel.tsx";
import ResultsPanel from "../components/ResultsPanel.tsx";
import EditorPanel from "../components/EditorPanel.tsx";
import CommitPanel from "../components/CommitPanel.tsx";

import { GameState } from "../contexts/GameContext.tsx";

type GameLocationState = {
    players: string[];
    currentPlayer: string;
    imposter: string;
    chat: any[];
    problem: any;
    testCycle: any[];
    code: string;
};

export default function Game() {
    const {
        gameState,
        setPlayers,
        setCurrentPlayer,
        setImposter,
        setChat,
        setProblem,
        setTestCycle,
        setCode,
        problem,
        imposter
    } = useGame();

    const { send, onMessage } = useSocket();
    const { roomId, username } = useRoom();

    const location = useLocation();

    // Allow undefined states just in case there's a timing issue
    const navState = location.state as GameLocationState | undefined;

    // init briefing variables
    const [isBriefingOpen, setIsBriefingOpen] = useState<boolean>(false);
    const [hasSentReady, setHasSentReady] = useState<boolean>(false);
    const [briefingOver, setBriefingOver] = useState<boolean>(false);
    const [readyCount, setReadyCount] = useState<number>(0);

    // allow case where difficulty hasn't been recieved yet
    const difficultyStyle = problem?.difficulty === "Easy"
        ? "bg-green-500/20 text-green-300 border-green-500/30"
        : problem?.difficulty === "Medium"
            ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
            : "bg-red-500/20 text-red-300 border-red-500/30";

    useEffect(() => {
        // subscribe to server events related to briefing
        const offBriefingEnded = onMessage?.("briefing-ended", (_msg: any) => {
            setBriefingOver(true);
            setIsBriefingOpen(false);
        });

        const offReadyUpdate = onMessage?.("player-ready-update", (msg: any) => {
            if (msg?.readyList && Array.isArray(msg.readyList)) {
                setReadyCount(msg.readyList.length);
            }
        });

        return () => {
            if (typeof offBriefingEnded === "function") offBriefingEnded();
            if (typeof offReadyUpdate === "function") offReadyUpdate();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!navState) return;

        setPlayers(navState.players);
        setCurrentPlayer(navState.currentPlayer);
        setImposter(navState.imposter);
        setChat(navState.chat);
        setProblem(navState.problem);
        setTestCycle(navState.testCycle);
        setCode(navState.code);

        // Open briefing modal when we first receive navState
        setIsBriefingOpen(true);
        setBriefingOver(false);
        setReadyCount(0);

        const t: ReturnType<typeof setTimeout> = window.setTimeout(() => {
            handleCloseBriefing();
        }, 15000); // 15 seconds

        return () => window.clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navState]);

    function handleCloseBriefing() {
        setIsBriefingOpen(false);
        if (!hasSentReady) {
            send?.({ type: "player-ready", roomId, playerId: username });
            setHasSentReady(true);
        }
    }

    const phaseLabel = gameState === GameState.Coding
        ? "Coding"
        : gameState === GameState.Voting
            ? "Voting"
            : "Results";

    // determine if current user is the imposter (safe guards)
    const currentImposter = imposter ?? navState?.imposter;
    const iAmImposter = !!username && !!currentImposter && username === currentImposter;

    return (
        <>
            {/* Blocking layer: shown while briefing modal is open OR waiting for others */}
            {(isBriefingOpen || (!briefingOver && hasSentReady)) && (
                <div className="fixed inset-0 z-40 flex items-center justify-center">
                    {/* blurred backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                    {/* If modal open show briefing modal */}
                    {isBriefingOpen && (
                        <div className="relative z-50 max-w-3xl w-full bg-brand-gray rounded-2xl border border-gray-700 p-6 shadow-lg mx-4">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    {iAmImposter ? (
                                        // Imposter message follows ProblemPanel wording/structure
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-100">You are the Imposter</h2>
                                            <p className="text-sm text-gray-300 mt-2">
                                                Your mission is to blend in and avoid detection. Submit convincing code, and try to steer votes away from yourself.
                                            </p>
                                            {/* show same hint content ProblemPanel would show */}
                                            {problem?.hint && (
                                                <div className="mt-4 rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4">
                                                    <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 mb-2">Hint</p>
                                                    <pre className="whitespace-pre-wrap text-sm font-mono text-gray-300">{problem.hint}</pre>
                                                </div>
                                            )}
                                            {Array.isArray(problem?.hints) && problem.hints.length > 0 && (
                                                <div className="mt-4 rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4">
                                                    <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 mb-2">Hints</p>
                                                    {problem.hints.map((h: string, idx: number) => (
                                                        <pre key={idx} className="whitespace-pre-wrap text-sm font-mono text-gray-300">{h}</pre>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        // Non-imposter: full problem as before
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-100">{problem?.title ?? "Problem"}</h2>
                                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold mt-2 ${difficultyStyle}`}>
                                                {problem?.difficulty ?? "Unknown"}
                                            </span>

                                            <div className="mt-4 max-h-[60vh] overflow-y-auto text-gray-300">
                                                <p className="leading-relaxed">{problem?.description ?? "No description available."}</p>

                                                {Array.isArray(problem?.examples) && problem.examples.length > 0 && (
                                                    <div className="mt-4 space-y-3">
                                                        {problem.examples.map((example: string, i: number) => (
                                                            <div key={i}>
                                                                <p className="text-gray-300 text-sm font-semibold mb-1">Example {i + 1}</p>
                                                                <pre className="bg-brand-gray-light border border-gray-700 p-3 rounded-xl whitespace-pre-wrap text-sm font-mono text-gray-300">
                                                                    {example}
                                                                </pre>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {Array.isArray(problem?.constraints) && problem.constraints.length > 0 && (
                                                    <div className="mt-4 rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4">
                                                        <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 mb-2">Constraints</p>
                                                        <ul className="list-disc pl-5 space-y-1">
                                                            {problem.constraints.map((c: string, i: number) => <li key={i} className="text-sm text-gray-400">{c}</li>)}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <button
                                        onClick={handleCloseBriefing}
                                        className="px-3 py-1 rounded bg-purple-700 text-white cursor-pointer hover:opacity-90"
                                    >
                                        Ready-up
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* If user closed modal and is waiting for others */}
                    {!isBriefingOpen && !briefingOver && hasSentReady && (
                        <div className="relative z-50 flex flex-col items-center gap-3 p-6 mx-4">
                            <div className="text-center max-w-md">
                                <h3 className="text-lg font-semibold text-gray-100">Please wait for others to ready-up</h3>
                                <p className="text-sm text-gray-300 mt-2">You are ready. Waiting for other players to dismiss their briefing.</p>
                                <p className="text-sm text-gray-400 mt-3">Ready: <span className="font-medium text-gray-100">{readyCount}</span> / <span className="font-medium text-gray-100">{navState?.players?.length ?? "?"}</span></p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Main app UI (blocked visually while briefing/waiting) */}
            <div className={`flex h-screen flex-col bg-brand-black ${ (isBriefingOpen || (!briefingOver && hasSentReady)) ? "pointer-events-none select-none" : "" }`}>
                <div className="px-5 pt-5 pb-3">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-extrabold tracking-tight">
                            <span className="text-purple-500">Cheet</span>
                            <span className="text-white">Code</span>
                        </h1>
                        <span className="rounded-full border border-gray-700 bg-brand-gray px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gray-300">
                            {phaseLabel}
                        </span>
                    </div>
                </div>

                <div className="min-h-0 flex-1 px-3 pb-3">
                    <div className="flex min-h-0 h-full items-stretch gap-2 rounded-2xl border border-gray-800 bg-gradient-to-b from-brand-black via-brand-black to-[#13131b]/60 p-1.5">
                        {gameState === GameState.Coding &&
                            (<div className="flex min-h-0 flex-1 items-stretch gap-2">
                                <SideBar />
                                <ProblemPanel />
                                <EditorPanel />
                            </div>)}
                        {gameState === GameState.Voting &&
                            (<div className="flex min-h-0 flex-1 items-stretch gap-2">
                                <VoteSideBar voting={true} />
                                <ProblemPanel />
                                <CommitPanel />
                            </div>)}
                        {gameState === GameState.Results &&
                            (<div className="flex min-h-0 flex-1 items-stretch gap-2">
                                <VoteSideBar voting={false} />
                                <ResultsPanel />
                                <CommitPanel />
                            </div>)}
                    </div>
                </div>
            </div >
        </>
    );
}