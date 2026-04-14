import { useSocket } from "../contexts/SocketContext.tsx";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

type CreateFormProps = {
  onCancelCreateClick: () => void;
};

export default function CreateForm({ onCancelCreateClick }: CreateFormProps) {
  const {
    isConnected,
    send,
    onMessage
  } = useSocket();

  const navigate = useNavigate();

  const [username, setUsername] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("Easy");
  const [capacity, setCapacity] = useState<number>(5);
  const [codingTime, setCodingTime] = useState<number>(5);
  const [votingTime, setVotingTime] = useState<number>(2);

  useEffect(() => {
    const unsubRoomCreate = onMessage("room-created", (data) => {
      navigate("/Lobby", {
        state: {
          roomId: data.roomId,
          username: data.playerId,
          difficulty: data.difficulty,
          capacity: data.capacity,
          codingTime: data.codingTime,
          votingTime: data.votingTime,
          players: [data.playerId],
        },
      });
    });

    return () => unsubRoomCreate();
  }, [onMessage, navigate, username]);

  function onCreateClick() {
    if (!username.trim()) {
      console.error("Username cannot be empty");
      return;
    }
    if (!isConnected) {
      console.error("Socket not connected");
      return;
    }
    const request = {
      type: "create-room",
      playerId: username,
      difficulty: difficulty,
      capacity: capacity,
      codingTime: codingTime * 60,
      votingTime: votingTime * 60
    };
    send(request);
  }

  const canCreate = username.trim() !== "";

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center">
        <form className="bg-brand-gray rounded-2xl border border-gray-700 w-full max-w-xl flex flex-col gap-6 p-7 shadow-xl mx-4" autoComplete="off">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 bg-purple-600 rounded-full" />
              <h1 className="text-gray-100 text-lg font-bold">Create Room</h1>
            </div>
            <p className="text-gray-500 text-xs">Set up the room, choose your preferences, and invite the rest of the lobby.</p>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="username" className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Username</label>
              <input
                type="text"
                id="username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="border border-gray-700 rounded-xl bg-brand-gray-light text-gray-100 placeholder-gray-600 px-4 py-2.5 text-sm outline-none focus:border-purple-600 transition-colors duration-200"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="difficulty" className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Difficulty</label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="border border-gray-700 rounded-xl bg-brand-gray-light text-gray-100 px-4 py-2.5 text-sm outline-none focus:border-purple-600 transition-colors duration-200"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="room-capacity" className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Room Capacity</label>
                <select
                  id="room-capacity"
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="border border-gray-700 rounded-xl bg-brand-gray-light text-gray-100 px-4 py-2.5 text-sm outline-none focus:border-purple-600 transition-colors duration-200"
                >
                  <option value={3}>3 Players</option>
                  <option value={4}>4 Players</option>
                  <option value={5}>5 Players</option>
                  <option value={6}>6 Players</option>
                  <option value={7}>7 Players</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="coding-time" className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Coding Time</label>
                <select
                  id="coding-time"
                  value={codingTime}
                  onChange={(e) => setCodingTime(Number(e.target.value))}
                  className="border border-gray-700 rounded-xl bg-brand-gray-light text-gray-100 px-4 py-2.5 text-sm outline-none focus:border-purple-600 transition-colors duration-200"
                >
                  <option value={3}>3 Minutes</option>
                  <option value={4}>4 Minutes</option>
                  <option value={5}>5 Minutes</option>
                  <option value={6}>6 Minutes</option>
                  <option value={7}>7 Minutes</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="voting-time" className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Voting Time</label>
                <select
                  id="voting-time"
                  value={votingTime}
                  onChange={(e) => setVotingTime(Number(e.target.value))}
                  className="border border-gray-700 rounded-xl bg-brand-gray-light text-gray-100 px-4 py-2.5 text-sm outline-none focus:border-purple-600 transition-colors duration-200"
                >
                  <option value={1.5}>1.5 Minutes</option>
                  <option value={2}>2 Minutes</option>
                  <option value={2.5}>2.5 Minutes</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancelCreateClick}
              className="cursor-pointer flex-1 py-2.5 rounded-xl font-bold text-sm text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-gray-200 transition-all duration-200 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onCreateClick}
              className={`cursor-pointer flex-1 py-2.5 rounded-xl font-bold text-sm text-white bg-purple-700 ${canCreate ? "hover:bg-purple-600 active:scale-95" : ""} transition-all duration-200 disabled:opacity-40 disabled:cursor-default`}
              disabled={!canCreate}
            >
              Create Room
            </button>
          </div>
        </form>
      </div>
    </>
  );
}