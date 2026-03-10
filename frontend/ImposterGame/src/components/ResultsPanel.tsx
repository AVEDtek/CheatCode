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
            <div className="w-[35%] bg-gray-950 rounded-xl my-3 border-2 border-gray-700 text-center">
                <h1 className="text-purple-700 font-bold m-7 text-3xl">
                    {votedCorrectly ? (imposter === username ? "You got caught!" : "You caught the imposter!") : (imposter === username ? "You got away!" : "The imposter got away!")}
                </h1>
                <div className="text-gray-400 m-7">
                    <p>
                        {voted.length === 1
                            ? `${voted[0]} was voted out`
                            : `${voted.slice(0, -1).join(", ")} and ${voted[voted.length - 1]} were voted out`
                        }
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => onMainMenuClick()}
                    className="cursor-pointer w-40 m-7 p-3 mt-10 rounded-xl font-bold text-sm text-gray-200 bg-purple-700 hover:bg-purple-600 transition-colors duration-300">
                    Back to Main Menu
                </button>
            </div>
        </>
    );
}