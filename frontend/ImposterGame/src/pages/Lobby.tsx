import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import LobbyUserCard from "../components/LobbyUserCard.tsx";

import { useRoom } from "../contexts/RoomContext.tsx";
import { useGame } from "../contexts/GameContext.tsx";

type LobbyLocationState = {
  roomId: string;
  username: string;
  players: string[];
};

export default function Lobby() {
  const { roomId, players, setRoomId, setUsername, setPlayers } = useRoom();
  const location = useLocation();
  const navState = location.state as LobbyLocationState;

  const {

  } = useGame();

  useEffect(() => {
    setRoomId(navState.roomId);
    setUsername(navState.username);
    setPlayers(navState.players);

  }, [navState]);

  async function copyCode() {

  }

  async function startGame() {

  }

  return (
    <>
      <div className="h-screen bg-gray-950">
        <div className="flex">
          <h1 className="text-purple-700 text-xl font-bold m-5">
            Cheet
            <strong className="text-white">Code</strong>
          </h1>
        </div>
        <div className="flex flex-1">
          <div className="w-[25%]">
          </div>
          <div className="w-[30%] border-2 border-gray-700 text-gray-200 rounded-xl m-1 bg-gray-900 my-10 h-[500px]">
            <h1 className="text-gray-200 font-bold m-7 text-2xl">
              Players
            </h1>
            {players.map((player) => (
              <div key={player}>
                <LobbyUserCard username={player} />
              </div>
            ))}
          </div>
          <div className="flex flex-col justify-between w-[20%] border-2 border-gray-700 text-gray-200 rounded-xl m-1 bg-gray-900 my-10 h-[500px]">
            <div>
              <h1 className="text-gray-300 font-bold mx-7 mt-7 text-xl">
                Room Code:
              </h1>
              <h1 onClick={copyCode} className="text-purple-600 font-bold mx-7 text-xl cursor-pointer rounded-xl">
                {roomId}
              </h1>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => startGame()}
                className="cursor-pointer w-30 m-7 p-3 mt-10 rounded-xl font-bold text-sm text-gray-200 bg-purple-700 hover:bg-purple-600 transition-colors duration-300">
                Start Game
              </button>
            </div>
          </div>
          <div className="w-[25%]">
          </div>
        </div>
      </div>
    </>
  );
}