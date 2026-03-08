import { File } from "lucide-react";

type CommitCardProps = {
    index: number;
    username: string;
    isFirst: boolean;
    isLast: boolean;
    highlight: boolean;
    handleCommitClick: (index: number) => void;
};

export default function CommitCard({ index, username, isFirst, isLast, highlight, handleCommitClick }: CommitCardProps) {
    return (
        <>
            <div
                onClick={() => handleCommitClick(index)}
                className={`flex items-center w-60 h-15 border-x-2 border-t-2 border-gray-700 text-sm cursor-pointer
                    ${highlight ? "bg-purple-900" : "bg-gray-900"}
                    ${isFirst ? "rounded-t-md" : "rounded-t-none"}
                    ${isLast ? "rounded-b-md" : "rounded-b-none"}
                    ${isLast ? "border-b-2" : "border-b-none"}`}
            >
                <div className="m-2 text-gray-300">
                    <div className="flex">
                        <File size={16} className="mr-2" />
                        {username}
                    </div>
                    <div className="text-xs text-gray-500">
                        Commit #{index + 1}
                    </div>
                </div>
            </div>
        </>
    );
}