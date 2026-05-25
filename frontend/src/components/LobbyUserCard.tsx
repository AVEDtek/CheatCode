import { User, Loader2 } from "lucide-react";

type LobbyUserCardProps = {
    username: string;
    highlight: boolean;
    isHost?: boolean;
    loading?: boolean;
}

export default function LobbyUserCard({ username, highlight, isHost = false, loading = false }: LobbyUserCardProps) {
    const labels: string[] = [];
    if (isHost) labels.push("Host");
    if (highlight) labels.push("You");
    if (loading) labels.push("Waiting...");

    return (
        <>
            <div
                className={`mx-5 mb-2 flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200 ${loading
                    ? "border-gray-700 bg-brand-gray-light/20 text-gray-500"
                    : highlight
                        ? "border-purple-500/40 bg-purple-700/30 text-white"
                        : "border-gray-700 bg-brand-gray-light/40 text-gray-200"}`}
            >
                {loading ? (
                    <Loader2 size={16} className="text-gray-500 animate-spin" />
                ) : (
                    <User size={16} className={`${highlight ? "text-purple-200" : "text-gray-400"}`} />
                )}
                <span className={`text-sm font-semibold ${loading ? "text-gray-500" : highlight ? "text-white" : "text-gray-200"}`}>
                    {username}
                </span>
                {labels.length > 0 && (
                    <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${loading
                            ? "bg-gray-700/40 text-gray-400"
                            : "bg-purple-500/20 text-purple-200"}`}
                    >
                        {labels.join(" · ")}
                    </span>
                )}
            </div>
        </>
    );
}
