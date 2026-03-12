import { useSocket } from "../contexts/SocketContext.tsx";
import { useRoom } from "../contexts/RoomContext.tsx";

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import LobbyUserCard from "../components/LobbyUserCard.tsx";

type LobbyLocationState = {
  roomId: string;
  username: string;
  players: string[];
};

export default function Lobby() {
  const {
    send,
    onMessage,
    isConnected
  } = useSocket();
  const {
    roomId,
    setRoomId,
    username,
    setUsername,
    players,
    setPlayers
  } = useRoom();

  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as LobbyLocationState;

  useEffect(() => {
    const unsubGameStart = onMessage("game-started", (data) => {
      navigate("/Game", {
        state: {
          players: data.playerList,
          currentPlayer: data.playerList[0],
          imposter: data.imposterId,
          problem: data.problem,
          testCycle: data.testCycle,
          code: data.problem["code"]
        },
      });
    });

    return () => unsubGameStart();
  }, [onMessage]);

  useEffect(() => {
    setRoomId(navState.roomId);
    setUsername(navState.username);
    setPlayers(navState.players);

  }, [navState]);

  async function copyCode() {
    await navigator.clipboard.writeText(roomId);
  }

  async function onStartGameClick() {
    if (!isConnected) {
      console.error("Socket not connected");
      return;
    }
    const request = {
      type: "start-game",
      roomId: roomId,
    };

    send(request);
  }

  return (
    <>
      <div className="min-h-screen bg-brand-black">
        <div className="flex">
          <h1 className="text-purple-700 text-xl font-bold m-5">
            Cheet
            <strong className="text-white">Code</strong>
          </h1>
        </div>
        <div className="flex flex-1 items-stretch justify-center">
          <div className="flex-1">
          </div>
          <div className="w-[30%] min-w-[270px] border-2 border-gray-700 text-gray-200 rounded-xl m-1 bg-brand-gray my-10 h-auto min-h-[70vh]">
            <h1 className="text-gray-200 font-bold m-7 text-2xl">
              Players
            </h1>
            {players.map((player, index) => (
              <div key={index}>
                <LobbyUserCard username={player} highlight={player === username} />
              </div>
            ))}
          </div>
          <div className="flex flex-col justify-between w-[20%] min-w-[180px] border-2 border-gray-700 text-gray-200 rounded-xl m-1 bg-brand-gray my-10 h-auto min-h-[70vh]">
            <div className="flex items-center gap-2 mx-7 mt-7">
              <h1 className="text-gray-300 font-bold text-xl">
                Room Code:
              </h1>
              <h1 onClick={copyCode} className="text-purple-600 font-bold text-xl cursor-pointer rounded-xl hover:text-purple-500 transition-colors duration-300">
                {roomId}
              </h1>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => onStartGameClick()}
                className="cursor-pointer w-30 m-7 p-3 mt-10 rounded-xl font-bold text-sm text-gray-200 bg-purple-700 hover:bg-purple-600 transition-colors duration-300">
                Start Game
              </button>
            </div>
          </div>
          <div className="flex-1">
          </div>
        </div>
      </div>
    </>
  );
}