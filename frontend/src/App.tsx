import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";

import Welcome from "./pages/Welcome.tsx";
import Lobby from "./pages/Lobby.tsx";
import Game from "./pages/Game.tsx";

import SocketProvider from "./contexts/SocketContext.tsx";
import GameProvider from "./contexts/GameContext.tsx";
import RoomProvider from "./contexts/RoomContext.tsx";

function App() {
  return (
    <SocketProvider>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route
          element={
            <RoomProvider>
              <Outlet />
            </RoomProvider>
          }
        >
          <Route path="/Lobby" element={<Lobby />} />
          <Route
            path="/Game"
            element={
              <GameProvider>
                <Game />
              </GameProvider>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Analytics />
    </SocketProvider>
  );
}

export default App;
