import { useSocket } from "../contexts/SocketContext.tsx";
import { useRoom } from "../contexts/RoomContext.tsx";
import { useGame } from "../contexts/GameContext.tsx";

import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

export default function ErrorPanel() {
    const { send, isConnected } = useSocket();
    const { roomId, username } = useRoom();
    const { gameErrorMessage } = useGame();

    const navigate = useNavigate();

    const onMainMenuClick = () => {
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

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div className="relative z-50 w-full max-w-lg overflow-hidden rounded-3xl border border-red-500/20 bg-brand-gray shadow-xl">
                <div className="border-b border-gray-700 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className="h-5 w-1 rounded-full bg-red-500" />
                        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-100">Connection Error</h2>
                    </div>
                </div>

                <div className="space-y-4 p-6">
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-6 text-center">
                        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-red-400/30 bg-red-500/20 text-red-300">
                            <AlertTriangle size={18} />
                        </div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-red-300">Something Went Wrong</p>
                        <p className="text-sm leading-relaxed text-gray-300">
                            {gameErrorMessage || "An unexpected game error occurred."}
                        </p>
                    </div>

                    <div className="rounded-xl border border-gray-700 bg-brand-gray-light/40 px-4 py-3">
                        <p className="text-xs uppercase tracking-widest text-gray-500">Next Step</p>
                        <p className="mt-1 text-sm text-gray-300">Return to the main menu.</p>
                    </div>
                </div>

                <div className="flex justify-end border-t border-gray-700 px-6 py-4">
                    <button
                        type="button"
                        onClick={onMainMenuClick}
                        className="cursor-pointer w-full py-3 rounded-xl font-bold text-sm text-gray-300 border border-gray-700 hover:border-gray-500 hover:text-gray-100 active:scale-95 transition-all duration-200"
                    >
                        Back to Main Menu
                    </button>
                </div>
            </div>
        </div>
    );
}