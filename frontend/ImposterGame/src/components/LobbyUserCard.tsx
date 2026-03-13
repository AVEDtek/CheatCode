import { User } from "lucide-react";

type LobbyUserCardProps = {
    username: string;
    highlight: boolean;
}

export default function LobbyUserCard({ username, highlight }: LobbyUserCardProps) {
    return (
        <>
            <div
                className={`mx-5 mb-2 flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200 ${highlight
                    ? "border-purple-500/40 bg-purple-700/30 text-white"
                    : "border-gray-700 bg-brand-gray-light/40 text-gray-200"}`}
            >
                <User size={16} className={`${highlight ? "text-purple-200" : "text-gray-400"}`} />
                <span className={`text-sm font-semibold ${highlight ? "text-white" : "text-gray-200"}`}>
                    {username}
                </span>
                {highlight ? (
                    <span className="ml-auto rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-200">
                        You
                    </span>
                ) : null}
            </div>
        </>
    );
}