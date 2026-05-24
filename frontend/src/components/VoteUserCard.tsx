import { User } from "lucide-react";

type VoteUserCardProps = {
    username: string;
    votes: number;
    selected: boolean;
    disabled: boolean;
    handleCardClick: (username: string) => void;
}

export default function VoteUserCard({ username, votes, selected, disabled, handleCardClick }: VoteUserCardProps) {
    return (
        <>
            <button
                type="button"
                disabled={disabled}
                onClick={() => handleCardClick(username)}
                className={`mb-2 flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${selected
                    ? "bg-purple-700/30 border-purple-500/40 text-white"
                    : "bg-brand-gray-light/40 border-gray-700 text-gray-200"} ${!disabled && selected ? "hover:bg-purple-700/40" : ""} ${!disabled && !selected ? "hover:bg-brand-gray-light hover:border-gray-600" : ""} ${disabled ? "opacity-60 cursor-default" : "cursor-pointer active:scale-[0.99]"}`}
            >
                <User size={16} className={`${selected ? "text-purple-200" : "text-gray-400"}`} />
                <span className={`text-sm font-semibold ${selected ? "text-white" : "text-gray-200"}`}>
                    {username}
                </span>

                <div className={`ml-auto min-w-7 h-7 px-2 flex items-center justify-center rounded-full border text-xs font-bold ${selected ? "border-purple-200 text-purple-100 bg-purple-500/20" : "border-gray-600 text-gray-300 bg-gray-800"}`}>
                    {votes}
                </div>
            </button>
        </>
    );
}