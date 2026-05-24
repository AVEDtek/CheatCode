import { User } from "lucide-react";

type UserCardProps = {
    username: string;
    highlighted: boolean
}

export default function UserCard({ username, highlighted }: UserCardProps) {
    return (
        <>
            <div
                className={`mr-1 mb-2 flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200 ${highlighted
                    ? "border-purple-500/40 bg-purple-700/30 text-white"
                    : "border-gray-700 bg-brand-gray-light/40 text-gray-200"}`}
            >
                <User size={16} className={`${highlighted ? "text-purple-200" : "text-gray-400"}`} />
                <span className={`text-sm font-semibold truncate ${highlighted ? "text-white" : "text-gray-200"}`}>
                    {username}
                </span>
                {highlighted ? (
                    <span className="ml-auto rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-200">
                        Active
                    </span>
                ) : null}
            </div>
        </>
    );
}