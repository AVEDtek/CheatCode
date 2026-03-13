import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode
} from "react";
import { useSocket } from "./SocketContext";
import { useRoom } from "./RoomContext";

export const GameState = {
    Coding: "coding",
    Voting: "voting",
    Results: "results"
};

type GameProviderProps = {
    children: ReactNode;
};

type GameContextValue = {
    gameState: string;
    setGameState: React.Dispatch<React.SetStateAction<string>>;
    time: number;
    setTime: React.Dispatch<React.SetStateAction<number>>;
    players: string[];
    setPlayers: React.Dispatch<React.SetStateAction<string[]>>;
    currentPlayer: string;
    setCurrentPlayer: React.Dispatch<React.SetStateAction<string>>;
    imposter: string;
    setImposter: React.Dispatch<React.SetStateAction<string>>;
    chat: any[];
    setChat: React.Dispatch<React.SetStateAction<any[]>>;
    problem: any;
    setProblem: React.Dispatch<React.SetStateAction<any>>;
    testCycle: any[];
    setTestCycle: React.Dispatch<React.SetStateAction<any[]>>;
    code: string;
    setCode: React.Dispatch<React.SetStateAction<string>>;
    commits: any[];
    setCommits: React.Dispatch<React.SetStateAction<any[]>>;
    votes: any;
    setVotes: React.Dispatch<React.SetStateAction<any>>;
    voted: string[];
    setVoted: React.Dispatch<React.SetStateAction<string[]>>;
    votedCorrectly: boolean;
    setVotedCorrectly: React.Dispatch<React.SetStateAction<boolean>>;
};

const GameContext = createContext<GameContextValue>({
    gameState: GameState.Coding,
    setGameState: (_gameState: React.SetStateAction<string>) => { },
    time: 0,
    setTime: (_time: React.SetStateAction<number>) => { },
    players: [],
    setPlayers: (_players: React.SetStateAction<string[]>) => { },
    currentPlayer: "",
    setCurrentPlayer: (_currentPlayer: React.SetStateAction<string>) => { },
    imposter: "",
    setImposter: (_imposter: React.SetStateAction<string>) => { },
    chat: [],
    setChat: (_chat: React.SetStateAction<any[]>) => { },
    problem: null,
    setProblem: (_problem: React.SetStateAction<any>) => { },
    testCycle: [],
    setTestCycle: (_testCycle: React.SetStateAction<any[]>) => { },
    code: "",
    setCode: (_code: React.SetStateAction<string>) => { },
    commits: [],
    setCommits: (_commits: React.SetStateAction<any[]>) => { },
    votes: null,
    setVotes: (_votes: React.SetStateAction<any>) => { },
    voted: [],
    setVoted: (_voted: React.SetStateAction<string[]>) => { },
    votedCorrectly: false,
    setVotedCorrectly: (_votedCorrectly: React.SetStateAction<boolean>) => { }
});

export default function GameProvider({ children }: GameProviderProps) {
    const { onMessage, send } = useSocket();
    const { roomId, username } = useRoom();

    const [gameState, setGameState] = useState<string>(GameState.Coding);
    const [time, setTime] = useState<number>(0);

    const [players, setPlayers] = useState<string[]>([]);
    const [currentPlayer, setCurrentPlayer] = useState<string>("");
    const [imposter, setImposter] = useState<string>("");

    const [chat, setChat] = useState<any[]>([]);

    const [problem, setProblem] = useState<any>(null);
    const [testCycle, setTestCycle] = useState<any[]>([]);
    const [code, setCode] = useState<string>("");

    const [commits, setCommits] = useState<any[]>([]);
    const [votes, setVotes] = useState<any>(null);
    const [voted, setVoted] = useState<string[]>([]);
    const [votedCorrectly, setVotedCorrectly] = useState<boolean>(false);

    useEffect(() => {
        const unsubTimeLeft = onMessage("time-left", (data) => {
            setTime(data.timeLeft);
        });
        const unsubTurnOver = onMessage("turn-over", (data) => {
            const response = {
                type: "next-turn",
                roomId: roomId,
                playerId: username,
                code: code
            }
            send(response);
        });
        const unsubNextTurn = onMessage("next-turn", (data) => {
            setCurrentPlayer(data.currentPlayer);
            setCode(data.code);
        });
        const unsubChatUpdate = onMessage("chat-update", (data) => {
            setChat(data.chat);
        });
        const unsubStartVote = onMessage("start-vote", (data) => {
            setGameState(GameState.Voting);
            setCommits(data.commits);
        });
        const unsubVoteCasted = onMessage("vote-casted", (data) => {
            setVotes(data.voteList);
        });
        const unsubVoteOver = onMessage("vote-over", (data) => {
            setGameState(GameState.Results);
            setVoted(data.voted);
            setVotedCorrectly(data.votedCorrectly);
        });
        return () => {
            unsubTimeLeft();
            unsubTurnOver();
            unsubNextTurn();
            unsubChatUpdate();
            unsubStartVote();
            unsubVoteCasted();
            unsubVoteOver();
        };
    }, [onMessage, code]);

    const value = {
        gameState,
        setGameState,
        time,
        setTime,
        players,
        setPlayers,
        currentPlayer,
        setCurrentPlayer,
        imposter,
        setImposter,
        chat,
        setChat,
        problem,
        setProblem,
        testCycle,
        setTestCycle,
        code,
        setCode,
        commits,
        setCommits,
        votes,
        setVotes,
        voted,
        setVoted,
        votedCorrectly,
        setVotedCorrectly
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