import { useGame } from "../contexts/GameContext.tsx";

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import Logo from "../components/Logo.tsx";
import BriefingPanel from "../components/BriefingPanel.tsx";
import SideBar from "../components/SideBar.tsx";
import VoteSideBar from "../components/VoteSideBar.tsx";
import ProblemPanel from "../components/ProblemPanel.tsx";
import ResultsPanel from "../components/ResultsPanel.tsx";
import EditorPanel from "../components/EditorPanel.tsx";
import CommitPanel from "../components/CommitPanel.tsx";
import ErrorPanel from "../components/ErrorPanel.tsx";

import { GameState } from "../contexts/GameContext.tsx";

type GameLocationState = {
    players: string[];
    currentPlayer: string;
    imposter: string;
    chat: any[];
    problem: any;
    tests: any[];
    code: string;
};

export default function Game() {
    const {
        gameError,
        gameState,
        setPlayers,
        setCurrentPlayer,
        setImposter,
        setChat,
        setProblem,
        setTests,
        setCode
    } = useGame();

    const location = useLocation();

    const navState = location.state as GameLocationState | undefined;

    useEffect(() => {
        if (!navState) return;

        setPlayers(navState.players);
        setCurrentPlayer(navState.currentPlayer);
        setImposter(navState.imposter);
        setChat(navState.chat);
        setProblem(navState.problem);
        setTests(navState.tests);
        setCode(navState.code);
    }, [navState]);

    const isBriefing = gameState === GameState.Briefing;

    const phaseLabel = gameState === GameState.Briefing
        ? "Briefing"
        : gameState === GameState.Coding
            ? "Coding"
            : gameState === GameState.Voting
                ? "Voting"
                : "Results";

    return (
        <>
            {isBriefing && <BriefingPanel />}
            {gameError && <ErrorPanel />}
            <div className={`flex h-screen flex-col bg-brand-black transition-all duration-300 ${isBriefing || gameError ? "pointer-events-none select-none" : ""}`}>
                <div className="px-5 pt-5 pb-3">
                    <div className="flex items-center justify-between">
                        <Logo />
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest ${isBriefing ? "border-purple-500/30 bg-purple-500/10 text-purple-200" : "border-gray-700 bg-brand-gray text-gray-300"}`}>
                            {phaseLabel}
                        </span>
                    </div>
                </div>

                <div className="min-h-0 flex-1 px-3 pb-3">
                    <div className={`flex min-h-0 h-full items-stretch gap-2 rounded-2xl border p-1.5 transition-all duration-300 ${isBriefing
                        ? "border-purple-500/15 bg-gradient-to-b from-[#14141c] via-brand-black to-[#13131b]/80 blur-[1px] saturate-50"
                        : "border-gray-800 bg-gradient-to-b from-brand-black via-brand-black to-[#13131b]/60"}`}>
                        {(gameState === GameState.Coding || isBriefing) &&
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