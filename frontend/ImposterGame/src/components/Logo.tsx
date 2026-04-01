import { useSocket } from "../contexts/SocketContext";
import { useRoom } from "../contexts/RoomContext";

import { useNavigate } from "react-router-dom";

export default function Logo() {
    const navigate = useNavigate();
    const { send, isConnected } = useSocket();
    const { roomId, username } = useRoom();

    const onLogoClick = () => {
        if (!isConnected) {
            console.error("Socket not connected");
            return;
        }
        const request = {
            type: "leave",
            roomId: roomId,
            playerId: username
        };
        send(request);
        navigate("/");
    };

    return (
        <>
            <h1 onClick={() => onLogoClick()} className="text-2xl font-extrabold tracking-tight cursor-pointer">
                <span className="text-purple-500">Cheet</span>
                <span className="text-white">Code</span>
            </h1>
        </>
    );
}