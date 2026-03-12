import { useGame } from "../contexts/GameContext.tsx";

import UserCard from "./UserCard.tsx";

export default function SideBar() {
    const {
        time,
        players,
        currentPlayer
    } = useGame();

    return (
        <>
            <div className="w-[15%] min-w-[135px] shrink-0 self-start h-fit bg-brand-gray my-3 mr-10 border-y-2 border-r-2 border-gray-700 rounded-r-xl min-h-[85vh]">
                <div className="text-gray-400 m-5 text-sm mb-10 ">
                    Time until next round:
                    <br />
                    <strong className="font-bold text-white">
                        {Math.floor(time / 60)}:{String(time % 60).padStart(2, '0')}
                    </strong>
                </div>
                {players.map((player, index) => (
                    <div key={index}>
                        <UserCard username={player} highlighted={player === currentPlayer} />
                    </div>
                ))}
            </div>
        </>
    );
}