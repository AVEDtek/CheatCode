import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode
} from "react";
import { useSocket } from "./SocketContext";

type RoomProviderProps = {
    children: ReactNode;
};

type RoomContextValue = {
    roomId: string;
    setRoomId: React.Dispatch<React.SetStateAction<string>>;
    username: string;
    setUsername: React.Dispatch<React.SetStateAction<string>>;
    difficulty: string;
    setDifficulty: React.Dispatch<React.SetStateAction<string>>;
    capacity: number;
    setCapacity: React.Dispatch<React.SetStateAction<number>>;
    codingTime: number;
    setCodingTime: React.Dispatch<React.SetStateAction<number>>;
    votingTime: number;
    setVotingTime: React.Dispatch<React.SetStateAction<number>>;
    players: string[];
    setPlayers: React.Dispatch<React.SetStateAction<string[]>>;
};

const RoomContext = createContext<RoomContextValue>({
    roomId: "",
    setRoomId: (_roomId: React.SetStateAction<string>) => { },
    username: "",
    setUsername: (_username: React.SetStateAction<string>) => { },
    difficulty: "",
    setDifficulty: (_difficulty: React.SetStateAction<string>) => { },
    capacity: 0,
    setCapacity: (_capacity: React.SetStateAction<number>) => { },
    codingTime: 0,
    setCodingTime: (_codingTime: React.SetStateAction<number>) => { },
    votingTime: 0,
    setVotingTime: (_votingTime: React.SetStateAction<number>) => { },
    players: [],
    setPlayers: (_players: React.SetStateAction<string[]>) => { }
});

export default function RoomProvider({ children }: RoomProviderProps) {
    const { onMessage } = useSocket();

    const [roomId, setRoomId] = useState<string>("");
    const [username, setUsername] = useState<string>("");
    const [difficulty, setDifficulty] = useState<string>("");
    const [capacity, setCapacity] = useState<number>(0);
    const [codingTime, setCodingTime] = useState<number>(0);
    const [votingTime, setVotingTime] = useState<number>(0);
    const [players, setPlayers] = useState<string[]>([]);

    useEffect(() => {
        const unsubRoomJoin = onMessage("room-players-update", (data) => {
            setPlayers(data.playerList);
        });

        return () => {
            unsubRoomJoin();
        };
    }, [onMessage]);

    const value = {
        roomId,
        setRoomId,
        username,
        setUsername,
        difficulty,
        setDifficulty,
        capacity,
        setCapacity,
        codingTime,
        setCodingTime,
        votingTime,
        setVotingTime,
        players,
        setPlayers
    }

    return (
        <RoomContext.Provider value={value}>
            {children}
        </RoomContext.Provider>
    );
}

export function useRoom() {
    const context = useContext(RoomContext);
    if (!context) {
        throw new Error("useRoom must be used within a RoomProvider");
    }
    return context;
}