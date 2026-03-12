import { useRoom } from "../contexts/RoomContext.tsx";
import { useGame } from "../contexts/GameContext.tsx";

import { useNavigate } from "react-router-dom";

export default function ResultsPanel() {
    const { username } = useRoom();
    const {
        imposter,
        voted,
        votedCorrectly
    } = useGame();

    const navigate = useNavigate();

    const onMainMenuClick = () => {
        console.log("Navigating to main menu...");
        navigate("/");
    };

    return (
        <>
            <div className="w-[35%] max-h-[85vh] min-w-[315px] bg-brand-gray rounded-xl my-3 border-2 border-gray-700 text-center flex min-h-0 flex-col self-stretch">
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-7 py-10">
                    <h1 className="text-purple-700 font-bold text-3xl">
                        {votedCorrectly ? (imposter === username ? "You got caught!" : "You caught the imposter!") : (imposter === username ? "You got away!" : "The imposter got away!")}
                    </h1>
                    <div className="mt-7 text-gray-400">
                        <p>
                            {voted.length === 1
                                ? `${voted[0]} was voted out`
                                : `${voted.slice(0, -1).join(", ")} and ${voted[voted.length - 1]} were voted out`
                            }
                        </p>
                    </div>
                </div>
                <div className="flex justify-center px-7 pb-7">
                    <button
                        type="button"
                        onClick={() => onMainMenuClick()}
                        className="cursor-pointer w-40 rounded-xl bg-purple-700 p-3 text-sm font-bold text-gray-200 transition-colors duration-300 hover:bg-purple-600">
                        Back to Main Menu
                    </button>
                </div>
            </div>
        </>
    );
}