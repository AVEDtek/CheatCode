import { useSocket } from "../contexts/SocketContext.tsx";
import { useRoom } from "../contexts/RoomContext.tsx";
import { useGame } from "../contexts/GameContext.tsx";

import { useNavigate } from "react-router-dom";

export default function ResultsPanel() {
    const { send, isConnected } = useSocket();
    const { roomId, username } = useRoom();
    const {
        imposter,
        voted,
        votedCorrectly
    } = useGame();

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

    const isImposter = imposter === username;
    const won = (votedCorrectly && !isImposter) || (!votedCorrectly && isImposter);

    const headline = votedCorrectly
        ? (isImposter ? "You Got Caught!" : "Imposter Caught!")
        : (isImposter ? "You Got Away!" : "Imposter Escaped!");

    const subtext = votedCorrectly
        ? (isImposter ? "The crew was onto you all along." : "Great detective work — justice served.")
        : (isImposter ? "You blended in perfectly. Well played." : "The imposter slipped through the cracks.");

    const votedOutText = voted.length === 0
        ? "No one was voted out"
        : voted.length === 1
            ? `${voted[0]} was voted out`
            : `${voted.slice(0, -1).join(", ")} and ${voted[voted.length - 1]} were voted out`;

    return (
        <>
            <div className="w-[35%] max-h-[85vh] min-w-[315px] bg-brand-gray rounded-xl my-3 border-2 border-gray-700 flex min-h-0 flex-col self-stretch">
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 py-10 gap-6">
                    <div className={`flex flex-col items-center gap-3 w-full rounded-2xl py-8 px-6 border ${won ? "bg-purple-500/10 border-purple-500/30" : "bg-red-500/10 border-red-500/25"}`}>
                        <h1 className={`font-bold text-3xl tracking-tight ${won ? "text-purple-300" : "text-red-400"}`}>
                            {headline}
                        </h1>
                        <p className="text-gray-400 text-sm text-center leading-relaxed">
                            {subtext}
                        </p>
                    </div>

                    <div className="w-full flex flex-col gap-3">
                        <div className="flex flex-col gap-1 rounded-xl border border-gray-700 bg-brand-gray-light/40 px-4 py-3">
                            <span className="text-xs uppercase tracking-widest font-semibold text-gray-500">Voted Out</span>
                            <span className="text-gray-300 text-sm font-medium">{votedOutText}</span>
                        </div>
                        <div className="flex flex-col gap-1 rounded-xl border border-gray-700 bg-brand-gray-light/40 px-4 py-3">
                            <span className="text-xs uppercase tracking-widest font-semibold text-gray-500">The Imposter Was</span>
                            <span className="text-gray-300 text-sm font-medium">
                                {isImposter ? "You" : imposter}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-center px-6 pb-6">
                    <button
                        type="button"
                        onClick={() => onMainMenuClick()}
                        className="cursor-pointer w-full rounded-xl bg-purple-700 p-3 text-sm font-bold text-white transition-all duration-200 hover:bg-purple-600 active:scale-95">
                        Back to Main Menu
                    </button>
                </div>
            </div>
        </>
    );
}