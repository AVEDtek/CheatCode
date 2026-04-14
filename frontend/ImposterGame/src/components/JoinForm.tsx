import { useSocket } from "../contexts/SocketContext.tsx";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardPaste } from "lucide-react";

type JoinFormProps = {
  onCancelJoinClick: () => void;
};

export default function JoinForm({ onCancelJoinClick }: JoinFormProps) {
  const {
    isConnected,
    send,
    onMessage
  } = useSocket();

  const [errorMessage, setErrorMessage] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");

  const navigate = useNavigate();

  useEffect(() => {
    const unsubRoomJoin = onMessage("room-joined", (data) => {
      navigate("/Lobby", {
        state: {
          roomId: data.roomId,
          username: data.playerId,
          difficulty: data.difficulty,
          capacity: data.capacity,
          codingTime: data.codingTime,
          votingTime: data.votingTime,
          players: data.playerList
        },
      });
    });

    const unsubUnableToJoin = onMessage("unable-to-join", (data) => {
      setErrorMessage(data.errorMessage);
    });

    return () => {
      unsubRoomJoin();
      unsubUnableToJoin();
    };
  }, [onMessage, navigate, username]);

  function onJoinClick() {
    if (!isConnected) {
      console.error("Socket not connected");
      return;
    }
    const request = {
      type: "join-room",
      roomId: roomId,
      playerId: username,
    };
    send(request);
  }

  async function onPasteRoomCodeClick() {
    try {
      const text = await navigator.clipboard.readText();
      setRoomId(text.toUpperCase().trim());
      setErrorMessage("");
    } catch {
      setErrorMessage("Clipboard access was blocked. Please paste manually.");
    }
  }

  const canJoin = username.trim() !== "" && roomId.trim() !== "";

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center">
        <form className="bg-brand-gray rounded-2xl border border-gray-700 w-96 flex flex-col gap-6 p-7 shadow-xl" autoComplete="off">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-5 bg-purple-600 rounded-full" />
              <h1 className="text-gray-100 text-lg font-bold">Join Room</h1>
            </div>
            <p className="text-gray-500 text-xs">Enter a username and the room code shared by the host.</p>
          </div>

          <div className="flex flex-col gap-4">
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

            <div className="flex flex-col gap-2">
              <label htmlFor="roomId" className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Room Code</label>
              <div className="relative">
                <input
                  type="text"
                  id="roomId"
                  placeholder="e.g. ABCD12"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  autoCapitalize="characters"
                  className="w-full border border-gray-700 rounded-xl bg-brand-gray-light text-gray-100 placeholder-gray-600 px-4 pr-11 py-2.5 text-sm font-mono tracking-widest outline-none focus:border-purple-600 transition-colors duration-200"
                />
                <button
                  type="button"
                  onClick={onPasteRoomCodeClick}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors duration-200 cursor-pointer"
                  title="Paste room code"
                  aria-label="Paste room code"
                >
                  <ClipboardPaste size={14} />
                </button>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5">
              <span className="text-red-400 text-sm">{errorMessage}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancelJoinClick}
              className="cursor-pointer flex-1 py-2.5 rounded-xl font-bold text-sm text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-gray-200 transition-all duration-200 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onJoinClick}
              className={`cursor-pointer flex-1 py-2.5 rounded-xl font-bold text-sm text-white bg-purple-700 ${canJoin ? "hover:bg-purple-600 active:scale-95" : ""} transition-all duration-200 disabled:opacity-40 disabled:cursor-default`}
              disabled={!canJoin}
            >
              Join Room
            </button>
          </div>
        </form>
      </div>
    </>
  );
}