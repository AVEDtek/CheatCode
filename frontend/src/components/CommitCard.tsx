import { File } from "lucide-react";

type CommitCardProps = {
    index: number;
    username: string;
    isFirst: boolean;
    isLast: boolean;
    selected: boolean;
    handleCommitClick: (index: number) => void;
};

export default function CommitCard({ index, username, isFirst, isLast, selected, handleCommitClick }: CommitCardProps) {
    return (
        <>
            <button
                type="button"
                onClick={() => handleCommitClick(index)}
                className={`w-full text-left border border-gray-700 cursor-pointer transition-all duration-200 px-3 py-3
                    ${selected ? "bg-purple-700/30 border-purple-500/40" : "bg-brand-gray-light/40 hover:bg-brand-gray-light border-gray-700"}
                    ${isFirst ? "rounded-t-xl" : "rounded-t-none"}
                    ${isLast ? "rounded-b-xl" : "rounded-b-none"}`}
            >
                <div className="flex items-start gap-2">
                    <div className={`mt-0.5 ${selected ? "text-purple-200" : "text-gray-400"}`}>
                        <File size={16} />
                    </div>
                    <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${selected ? "text-white" : "text-gray-200"}`}>
                            {username}
                        </p>
                        <p className={`text-xs ${selected ? "text-purple-200" : "text-gray-500"}`}>
                            Commit #{index + 1}
                        </p>
                    </div>
                </div>
            </button>
        </>
    );
}