import { useRoom } from "../contexts/RoomContext.tsx";
import { useGame } from "../contexts/GameContext.tsx";

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import SideBar from "../components/SideBar.tsx";
import VoteSideBar from "../components/VoteSideBar.tsx";
import ProblemPanel from "../components/ProblemPanel.tsx";
import ImposterPanel from "../components/ImposterPanel.tsx";
import ResultsPanel from "../components/ResultsPanel.tsx";
import EditorPanel from "../components/EditorPanel.tsx";
import CommitPanel from "../components/CommitPanel.tsx";

import { GameState } from "../contexts/GameContext.tsx";

type GameLocationState = {
    players: string[];
    currentPlayer: string;
    imposter: string;
    problem: any;
    testCycle: any;
    code: string;
};

export default function Game() {
    const { username } = useRoom();

    const {
        gameState,
        setPlayers,
        setCurrentPlayer,
        imposter,
        setImposter,
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
        setProblem(navState.problem);
        setTestCycle(navState.testCycle);
        setCode(navState.code);

    }, [navState]);

    return (
        <>
            <div className="h-screen bg-gray-950">
                <div className="flex">
                    <h1 className="text-purple-700 text-xl font-bold m-5">
                        Cheet
                        <strong className="text-white">Code</strong>
                    </h1>
                </div>
                {gameState === GameState.Coding &&
                    (<div className="flex flex-1">
                        <SideBar />
                        {username === imposter ? <ImposterPanel /> : <ProblemPanel />}
                        <EditorPanel />
                    </div>)}
                {gameState === GameState.Voting &&
                    (<div className="flex flex-1">
                        <VoteSideBar voting={true} />
                        {username === imposter ? <ImposterPanel /> : <ProblemPanel />}
                        <CommitPanel />
                    </div>)}
                {gameState === GameState.Results &&
                    (<div className="flex flex-1">
                        <VoteSideBar voting={false} />
                        <ResultsPanel />
                        <CommitPanel />
                    </div>)}
            </div >
        </>
    );
}