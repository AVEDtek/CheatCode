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
    Briefing: "briefing",
    Coding: "coding",
    Voting: "voting",
    Results: "results"
};

type GameProviderProps = {
    children: ReactNode;
};

type GameContextValue = {
    gameError: boolean;
    setGameError: React.Dispatch<React.SetStateAction<boolean>>;
    gameErrorMessage: string;
    setGameErrorMessage: React.Dispatch<React.SetStateAction<string>>;
    gameState: string;
    setGameState: React.Dispatch<React.SetStateAction<string>>;
    briefingTime: number;
    setBriefingTime: React.Dispatch<React.SetStateAction<number>>;
    codingTime: number;
    setCodingTime: React.Dispatch<React.SetStateAction<number>>;
    turnTime: number;
    setTurnTime: React.Dispatch<React.SetStateAction<number>>;
    votingTime: number;
    setVotingTime: React.Dispatch<React.SetStateAction<number>>;
    players: string[];
    setPlayers: React.Dispatch<React.SetStateAction<string[]>>;
    currentPlayer: string;
    setCurrentPlayer: React.Dispatch<React.SetStateAction<string>>;
    imposter: string;
    setImposter: React.Dispatch<React.SetStateAction<string>>;
    readyCount: number;
    setReadyCount: React.Dispatch<React.SetStateAction<number>>;
    chat: any[];
    setChat: React.Dispatch<React.SetStateAction<any[]>>;
    problem: any;
    setProblem: React.Dispatch<React.SetStateAction<any>>;
    tests: any[];
    setTests: React.Dispatch<React.SetStateAction<any[]>>;
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
    gameError: false,
    setGameError: (_gameError: React.SetStateAction<boolean>) => { },
    gameErrorMessage: "",
    setGameErrorMessage: (_gameErrorMessage: React.SetStateAction<string>) => { },
    gameState: GameState.Briefing,
    setGameState: (_gameState: React.SetStateAction<string>) => { },
    briefingTime: 0,
    setBriefingTime: (_briefingTime: React.SetStateAction<number>) => { },
    codingTime: 0,
    setCodingTime: (_codingTime: React.SetStateAction<number>) => { },
    turnTime: 0,
    setTurnTime: (_turnTime: React.SetStateAction<number>) => { },
    votingTime: 0,
    setVotingTime: (_votingTime: React.SetStateAction<number>) => { },
    players: [],
    setPlayers: (_players: React.SetStateAction<string[]>) => { },
    currentPlayer: "",
    setCurrentPlayer: (_currentPlayer: React.SetStateAction<string>) => { },
    imposter: "",
    setImposter: (_imposter: React.SetStateAction<string>) => { },
    readyCount: 0,
    setReadyCount: (_skips: React.SetStateAction<number>) => { },
    chat: [],
    setChat: (_chat: React.SetStateAction<any[]>) => { },
    problem: null,
    setProblem: (_problem: React.SetStateAction<any>) => { },
    tests: [],
    setTests: (_tests: React.SetStateAction<any[]>) => { },
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

    const [gameError, setGameError] = useState<boolean>(false);
    const [gameErrorMessage, setGameErrorMessage] = useState<string>("");

    const [gameState, setGameState] = useState<string>(GameState.Briefing);
    const [briefingTime, setBriefingTime] = useState<number>(0);
    const [codingTime, setCodingTime] = useState<number>(0);
    const [turnTime, setTurnTime] = useState<number>(0);
    const [votingTime, setVotingTime] = useState<number>(0);

    const [players, setPlayers] = useState<string[]>([]);
    const [currentPlayer, setCurrentPlayer] = useState<string>("");
    const [imposter, setImposter] = useState<string>("");

    const [readyCount, setReadyCount] = useState<number>(0);

    const [chat, setChat] = useState<any[]>([]);

    const [problem, setProblem] = useState<any>(null);
    const [tests, setTests] = useState<any[]>([]);
    const [code, setCode] = useState<string>("");

    const [commits, setCommits] = useState<any[]>([]);
    const [votes, setVotes] = useState<any>(null);
    const [voted, setVoted] = useState<string[]>([]);
    const [votedCorrectly, setVotedCorrectly] = useState<boolean>(false);

    useEffect(() => {
        const unsubImposterDisconnected = onMessage("imposter-disconnected", () => {
            setGameError(true);
            setGameErrorMessage("The imposter has disconnected. The game cannot continue.");
        });
        const unsubNotEnoughPlayers = onMessage("not-enough-players", () => {
            setGameError(true);
            setGameErrorMessage("Not enough players. The game cannot continue.");
        });
        const unsubBriefingTimeLeft = onMessage("briefing-time-left", (data) => {
            setBriefingTime(data.briefingTimeLeft);
        });
        const unsubCodingTimeLeft = onMessage("coding-time-left", (data) => {
            setCodingTime(data.codingTimeLeft);
            setTurnTime(data.turnTimeLeft);
        });
        const unsubVotingTimeLeft = onMessage("voting-time-left", (data) => {
            setVotingTime(data.votingTimeLeft);
        });
        const unsubPlayerReady = onMessage("player-ready", (data) => {
            setReadyCount(data.readyCount);
        });
        const unsubBriefingOver = onMessage("briefing-over", () => {
            setGameState(GameState.Coding);
        });
        const unsubNewCode = onMessage("new-code", (data) => {
            setCode(data.code);
        });
        const unsubTurnOver = onMessage("turn-over", () => {
            const response = {
                type: "next-turn",
                roomId: roomId,
                playerId: username,
                code: code
            }
            send(response);
        });
        const unsubNextTurn = onMessage("next-turn", (data) => {
            setCurrentPlayer(data.playerId);
            setCode(data.code);
        });
        const unsubChatUpdate = onMessage("chat-update", (data) => {
            setChat(data.chat);
        });
        const unsubCodingOver = onMessage("coding-over", (data) => {
            setGameState(GameState.Voting);
            setCommits(data.commits);
        });
        const unsubVoteCasted = onMessage("vote-casted", (data) => {
            setVotes(data.voteList);
        });
        const unsubVotingOver = onMessage("voting-over", (data) => {
            setGameState(GameState.Results);
            setVoted(data.voted);
            setVotedCorrectly(data.votedCorrectly);
        });
        const unsubPlayersUpdate = onMessage("game-players-update", (data) => {
            setPlayers(data.playerList);
            setCurrentPlayer(data.playerId);
        });
        return () => {
            unsubImposterDisconnected();
            unsubNotEnoughPlayers();
            unsubBriefingTimeLeft();
            unsubCodingTimeLeft();
            unsubVotingTimeLeft();
            unsubPlayerReady();
            unsubBriefingOver();
            unsubNewCode();
            unsubTurnOver();
            unsubNextTurn();
            unsubChatUpdate();
            unsubCodingOver();
            unsubVoteCasted();
            unsubVotingOver();
            unsubPlayersUpdate();
        };
    }, [onMessage, send, roomId, username, code]);

    const value = {
        gameError,
        setGameError,
        gameErrorMessage,
        setGameErrorMessage,
        gameState,
        setGameState,
        briefingTime,
        setBriefingTime,
        codingTime,
        setCodingTime,
        turnTime,
        setTurnTime,
        votingTime,
        setVotingTime,
        players,
        setPlayers,
        currentPlayer,
        setCurrentPlayer,
        imposter,
        setImposter,
        readyCount,
        setReadyCount,
        chat,
        setChat,
        problem,
        setProblem,
        tests,
        setTests,
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