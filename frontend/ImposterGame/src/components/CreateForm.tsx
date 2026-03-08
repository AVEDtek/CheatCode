import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../contexts/SocketContext.tsx";

type CreateFormProps = {
  onCancelCreateClick: () => void;
};

export default function CreateForm({ onCancelCreateClick }: CreateFormProps) {
  const { isConnected, send, onMessage } = useSocket();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");

  useEffect(() => {
    const unsubRoom = onMessage("room-created", (data) => {
      navigate("/Lobby", {
        state: {
          roomId: data.roomId,
          username: username,
          players: [username],
        },
      });
    });

    return () => unsubRoom();
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
    };

    send(request);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center">
        <form className="bg-gray-900 rounded-lg border border-gray-700 w-100 h-50">
          <h1 className="text-white text-l font-bold m-5">Create Room</h1>

          <div className="flex flex-col m-5">
            <label className="text-gray-200 text-sm mb-2">Username</label>
            <input
              type="text"
              id="username"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="border border-gray-700 rounded bg-gray-900 text-white px-3 py-1"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onCancelCreateClick}
              className="cursor-pointer w-20 p-3 m-2 rounded-xl font-bold text-xs text-gray-200 bg-gray-800 hover:bg-gray-700 transition-colors duration-300"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onCreateClick}
              className="cursor-pointer w-20 p-3 m-2 rounded-xl font-bold text-xs text-gray-200 bg-purple-700 hover:bg-purple-600 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </>
  );
}