import { User } from "lucide-react";

type VoteUserCardProps = {
    username: string;
    votes: number;
    selected: boolean;
    handleCardClick: (username: string) => void;
}

export default function VoteUserCard({ username, votes, selected, handleCardClick }: VoteUserCardProps) {
    return (
        <>
            <div
                onClick={() => handleCardClick(username)}
                className={`flex items-center cursor-pointer text-white mr-5 mb-3 p-3 rounded-r-xl transition-colors duration-300 ${selected ? "bg-purple-700" : "bg-brand-gray-light"} ${selected ? "hover:bg-purple-600" : "hover:bg-gray-700"}
                    }`}
            >
                <User className="mr-3" />
                {username}

                <div className="ml-auto w-6 h-6 flex items-center justify-center rounded-full border-2 border-gray-200 text-xs">
                    {votes}
                </div>
            </div>
        </>
    );
}