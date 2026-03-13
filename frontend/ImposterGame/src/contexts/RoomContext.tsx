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
    players: string[];
    setPlayers: React.Dispatch<React.SetStateAction<string[]>>;
};

const RoomContext = createContext<RoomContextValue>({
    roomId: "",
    setRoomId: (_roomId: React.SetStateAction<string>) => { },
    username: "",
    setUsername: (_username: React.SetStateAction<string>) => { },
    players: [],
    setPlayers: (_players: React.SetStateAction<string[]>) => { }
});

export default function RoomProvider({ children }: RoomProviderProps) {
    const { onMessage } = useSocket();

    const [roomId, setRoomId] = useState<string>("");
    const [username, setUsername] = useState<string>("");
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