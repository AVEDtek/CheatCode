import { useGame } from "../contexts/GameContext.tsx";

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

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
        setCode
    } = useGame();

    const location = useLocation();
    const navState = location.state as GameLocationState;

    useEffect(() => {
        setPlayers(navState.players);
        setCurrentPlayer(navState.currentPlayer);
        setImposter(navState.imposter);
        setChat(navState.chat);
        setProblem(navState.problem);
        setTestCycle(navState.testCycle);
        setCode(navState.code);

    }, [navState]);

    const phaseLabel = gameState === GameState.Coding
        ? "Coding"
        : gameState === GameState.Voting
            ? "Voting"
            : "Results";

    return (
        <>
            <div className="flex h-screen flex-col bg-brand-black">
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