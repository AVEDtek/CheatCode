import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useSocket } from "./SocketContext";

type GameProviderProps = {
    children: ReactNode;
};

const GameContext = createContext({
    gameState: "",
    time: 0,
    players: [],
    currentPlayer: "",
    imposter: "",
    problem: null,
    testCycle: null,
    code: "",
    commits: [],
    votes: null,
    voted: [],
    votedCorrectly: false
});

export default function GameProvider({ children }: GameProviderProps) {
    const { onMessage } = useSocket();

    const [gameState, setGameState] = useState("coding");
    const [time, setTime] = useState(0);

    const [players, setPlayers] = useState([]);
    const [currentPlayer, setCurrentPlayer] = useState("");
    const [imposter, setImposter] = useState("");

    const [problem, setProblem] = useState(null);
    const [testCycle, setTestCycle] = useState(null);
    const [code, setCode] = useState("");

    const [commits, setCommits] = useState([]);
    const [votes, setVotes] = useState(null);
    const [voted, setVoted] = useState([]);
    const [votedCorrectly, setVotedCorrectly] = useState(false);

    // Listen only to game-related messages
    useEffect(() => {
        const unsubGameStart = onMessage("game-start", (data) => {
            console.log("Game started:", data);
            setGameState("coding");
            setProblem(data.problem);
            setPlayers(data.players);
            setImposter(data.imposter);
        });

        const unsubGameState = onMessage("game-state", (data) => {
            console.log("Game state updated:", data);
            setGameState(data.state);
            setTime(data.time);
        });

        const unsubPlayerCode = onMessage("player-code", (data) => {
            console.log("Player code received:", data);
            setCode(data.code);
        });

        return () => {
            unsubGameStart();
            unsubGameState();
            unsubPlayerCode();
        };
    }, [onMessage]);

    const value = {
        gameState,
        time,
        players,
        currentPlayer,
        imposter,
        problem,
        testCycle,
        code,
        commits,
        votes,
        voted,
        votedCorrectly
    }

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
}

export function useGame() {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error("useGame must be used within a GameProvider");
    }
    return context;
}