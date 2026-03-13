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

    return (
        <>
            <div className="flex h-screen flex-col bg-brand-black">
                <div className="flex">
                    <h1 className="text-purple-700 text-xl font-bold m-5">
                        Cheet
                        <strong className="text-white">Code</strong>
                    </h1>
                </div>
                {gameState === GameState.Coding &&
                    (<div className="flex min-h-0 flex-1 items-stretch">
                        <SideBar />
                        <ProblemPanel />
                        <EditorPanel />
                    </div>)}
                {gameState === GameState.Voting &&
                    (<div className="flex min-h-0 flex-1 items-stretch">
                        <VoteSideBar voting={true} />
                        <ProblemPanel />
                        <CommitPanel />
                    </div>)}
                {gameState === GameState.Results &&
                    (<div className="flex min-h-0 flex-1 items-stretch">
                        <VoteSideBar voting={false} />
                        <ResultsPanel />
                        <CommitPanel />
                    </div>)}
            </div >
        </>
    );
}