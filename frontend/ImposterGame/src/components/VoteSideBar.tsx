import { useSocket } from "../contexts/SocketContext.tsx";
import { useGame } from "../contexts/GameContext.tsx";
import { useRoom } from "../contexts/RoomContext.tsx";

import { useEffect, useState } from "react";

import VoteUserCard from "./VoteUserCard.tsx";

type VoteBarProps = {
    voting: boolean;
};

export default function VoteBar({ voting }: VoteBarProps) {
    const { send, isConnected } = useSocket();
    const { roomId, username } = useRoom();
    const {
        votingTime,
        players,
        votes
    } = useGame();

    const [voted, setVoted] = useState<boolean>(false);
    const [selectedUser, setSelectedUser] = useState<string>("");

    useEffect(() => {
        console.log("Players updated:", players);
        if (!players.includes(selectedUser)) {
            setSelectedUser("");
            setVoted(false);
        }
    }, [players]);

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
            voterId: username,
            votedId: selectedUser
        };
        send(request);
        setVoted(true);
    };

    const canVote = !voted && selectedUser !== "";

    return (
        <>
            <div className="flex flex-col w-[16%] min-w-[210px] shrink-0 self-start h-fit bg-brand-gray my-3 mr-8 border-2 border-gray-700 rounded-2xl min-h-[85vh] p-4 gap-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-5 bg-purple-600 rounded-full" />
                        <h2 className="text-gray-100 text-sm font-bold uppercase tracking-widest">Voting</h2>
                    </div>
                    <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${voting ? "bg-green-500/10 text-green-400" : "bg-gray-800 text-gray-400"}`}>
                        {voting ? "Open" : "Closed"}
                    </span>
                </div>

                <div className="rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4">
                    <p className="text-[11px] uppercase tracking-widest font-semibold text-gray-500">Time Until Voting Ends</p>
                    {voting ? (
                        <>
                            <strong className="font-bold text-3xl text-white leading-tight tabular-nums">
                                {Math.floor(votingTime / 60)}:{String(votingTime % 60).padStart(2, "0")}
                            </strong>
                            <div className="mt-3 h-1.5 w-full rounded-full bg-gray-700 overflow-hidden">
                                <div
                                    className="h-full bg-purple-600 transition-all duration-1000"
                                    style={{ width: `${(votingTime / 120) * 100}%` }}
                                />
                            </div>
                        </>
                    ) : (
                        <p className="text-gray-500 text-sm mt-1">Voting has ended.</p>
                    )}
                </div>

                <div className="flex items-center justify-between px-1">
                    <p className="text-[11px] uppercase tracking-widest font-semibold text-gray-500">Players</p>
                    <span className="text-xs text-gray-400 bg-gray-800 rounded-full px-2 py-0.5">{players.length}</span>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
                    {players.map((player, index) => (
                        <VoteUserCard
                            key={index}
                            username={player}
                            votes={votes?.[player] ?? 0}
                            selected={player === selectedUser}
                            disabled={!voting || voted || player === username}
                            handleCardClick={handleCardClick}
                        />
                    ))}
                </div>

                <div className="pt-1">
                    {voting ? (
                        <button
                            type="button"
                            onClick={castVote}
                            className={`cursor-pointer w-full p-3 rounded-xl font-bold text-sm text-white bg-purple-700 ${canVote ? "hover:bg-purple-600 active:scale-95" : ""} transition-all duration-200 disabled:cursor-default disabled:opacity-40`}
                            disabled={!canVote}
                        >
                            Vote
                        </button>
                    ) : null}
                </div>
            </div>
        </>
    );
}