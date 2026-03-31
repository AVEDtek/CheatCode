import { useSocket } from "../contexts/SocketContext.tsx";
import { useRoom } from "../contexts/RoomContext.tsx";

import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import Logo from "../components/Logo.tsx";
import LobbyUserCard from "../components/LobbyUserCard.tsx";

type LobbyLocationState = {
  roomId: string;
  username: string;
  players: string[];
};

const MIN_PLAYERS_TO_START = (() => {
  const raw = import.meta.env.VITE_MIN_PLAYERS_TO_START;
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 3;
})();

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
          chat: data.chat,
          problem: data.problem,
          testCycle: data.testCases,
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

  async function onLeaveRoomClick() {
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
  }

  const canStartGame = players.length >= MIN_PLAYERS_TO_START && players[0] === username;

  return (
    <>
      <div className="min-h-screen bg-brand-black">
        <div className="px-5 pt-5 pb-3">
          <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between">
            <Logo />
            <span className="rounded-full border border-gray-700 bg-brand-gray px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gray-300">
              Lobby
            </span>
          </div>
        </div>

        <div className="px-4 pb-6">
          <div className="mx-auto w-full max-w-[1180px] rounded-2xl border border-gray-800 bg-gradient-to-b from-brand-black via-brand-black to-[#13131b]/60 p-2">
            <div className="grid min-h-[74vh] grid-cols-1 gap-2 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="border-2 border-gray-700 text-gray-200 rounded-2xl bg-brand-gray flex min-h-0 flex-col">
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-purple-600 rounded-full" />
                    <h1 className="text-gray-200 font-bold text-xl">Players</h1>
                  </div>
                  <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-gray-800 text-gray-400">
                    {players.length} / 5
                  </span>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto custom-scrollbar px-4 py-4">
                  {players.map((player, index) => (
                    <LobbyUserCard key={index} username={player} highlight={player === username} />
                  ))}
                  {Array.from({ length: 5 - players.length }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-gray-700 text-gray-700 text-sm"
                    >
                      <div className="w-5 h-5 rounded-full border border-dashed border-gray-700" />
                      Waiting for player...
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col justify-between border-2 border-gray-700 text-gray-200 rounded-2xl bg-brand-gray min-h-0">
                <div className="flex flex-col gap-4 px-5 pt-5">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-5 bg-purple-600 rounded-full" />
                    <h1 className="text-gray-200 font-bold text-xl">Room Details</h1>
                  </div>

                  <div className="flex flex-col gap-1 bg-gray-800 rounded-xl p-4">
                    <span className="text-gray-500 text-xs uppercase tracking-widest font-semibold">Room Code</span>
                    <button
                      type="button"
                      onClick={copyCode}
                      className="text-purple-500 text-2xl font-mono font-bold tracking-widest hover:text-purple-400 transition-colors duration-200 text-left cursor-pointer"
                      title="Click to copy"
                    >
                      {roomId}
                    </button>
                    <span className="text-gray-600 text-xs">click to copy</span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-0.5 border border-gray-700 rounded-xl p-3">
                      <span className="text-gray-500 text-xs uppercase tracking-widest font-semibold">Host</span>
                      <span className="text-gray-200 font-semibold truncate">{players[0]}</span>
                    </div>

                    <div className="flex flex-col gap-0.5 border border-gray-700 rounded-xl p-3">
                      <span className="text-gray-500 text-xs uppercase tracking-widest font-semibold">Players</span>
                      <div className="flex items-end gap-1">
                        <span className="text-gray-200 font-bold text-2xl leading-none">{players.length}</span>
                        <span className="text-gray-500 text-sm mb-0.5">/ 5</span>
                      </div>
                      <div className="flex gap-1 mt-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full ${i < players.length ? "bg-purple-600" : "bg-gray-700"} transition-colors duration-300`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {!canStartGame && (
                    <p className="text-gray-600 text-xs text-center">
                      {players[0] !== username
                        ? "Only the host can start"
                        : `Need at least ${MIN_PLAYERS_TO_START} player${MIN_PLAYERS_TO_START === 1 ? "" : "s"}`}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2 px-5 pb-5 pt-4">
                  <button
                    type="button"
                    onClick={() => onStartGameClick()}
                    className={`cursor-pointer w-full py-3 rounded-xl font-bold text-sm text-white bg-purple-700 ${canStartGame ? "hover:bg-purple-600 active:scale-95" : ""} transition-all duration-200 disabled:cursor-default disabled:opacity-40`}
                    disabled={!canStartGame}
                  >
                    Start Game
                  </button>
                  <button
                    type="button"
                    onClick={() => onLeaveRoomClick()}
                    className="cursor-pointer w-full py-3 rounded-xl font-bold text-sm text-gray-400 bg-transparent border border-gray-700 hover:border-gray-500 hover:text-gray-200 transition-all duration-200 active:scale-95"
                  >
                    Leave Room
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}