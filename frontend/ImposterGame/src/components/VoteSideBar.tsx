import { useSocket } from "../contexts/SocketContext.tsx";
import { useGame } from "../contexts/GameContext.tsx";
import { useRoom } from "../contexts/RoomContext.tsx";

import { useState } from "react";

import VoteUserCard from "./VoteUserCard.tsx";

type VoteBarProps = {
    voting: boolean;
};

export default function VoteBar({ voting }: VoteBarProps) {
    const { send, isConnected } = useSocket();
    const { roomId, username } = useRoom();
    const {
        time,
        players,
        votes
    } = useGame();

    const [voted, setVoted] = useState<boolean>(false);
    const [selectedUser, setSelectedUser] = useState<string>("");

    const handleCardClick = (username: string) => {
        setSelectedUser(username)
    };

    const castVote = () => {
        if (!isConnected) {
            console.error("Socket not connected");
            return;
        }
        const request = {
            type: "cast-vote",
            roomId: roomId,
            playerId: selectedUser
        };
        send(request);
        setVoted(true);
    };

    const canVote = !voted && selectedUser !== "" && selectedUser !== username;

    return (
        <>
            <div className="flex flex-col justify-between w-[15%] bg-gray-900 my-3 mr-10 border-y-2 border-r-2 border-gray-700 rounded-r-xl">
                <div>
                    <div className="text-gray-400 m-5 text-sm mb-10 ">
                        {voting ? (
                            <div>
                                Time until voting ends:
                                <br />
                                <strong className="font-bold text-white">
                                    {Math.floor(time / 60)}:{String(time % 60).padStart(2, '0')}
                                </strong>
                            </div>
                        ) :
                            "Voting has ended."}
                    </div>
                    {players.map((player, index) => (
                        <div key={index}>
                            <VoteUserCard username={player} votes={votes?.[player] ?? 0} selected={player === selectedUser} handleCardClick={handleCardClick} />
                        </div>
                    ))}
                </div>
                <div className="flex justify-end">
                    {voting ?
                        <button
                            onClick={castVote}
                            className="cursor-pointer w-20 m-2 mt-60 p-3 rounded-xl font-bold text-sm text-gray-200 bg-purple-700 hover:bg-purple-600 transition-colors duration-300 disabled:bg-gray-700 disabled:cursor-not-allowed"
                            disabled={!canVote}
                        >
                            Vote
                        </button>
                        : null}
                </div>
            </div>
        </>
    );
}