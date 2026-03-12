import { GitCommitHorizontal } from "lucide-react";

import { useState } from "react";

import Editor from "@monaco-editor/react";
import CommitCard from "./CommitCard.tsx";

import { useGame } from "../contexts/GameContext.tsx";

export default function VersionPanel() {
    const [selectedCommit, setSelectedCommit] = useState<number>(-1);

    const {
        commits
    } = useGame();

    const handleCommitClick = (index: number) => {
        setSelectedCommit(index)
    };

    return (
        <>
            <div className="w-[50%] max-h-[85vh] min-w-[450px] rounded-xl bg-brand-gray border-2 border-gray-700 m-3 flex min-h-0 flex-col">
                <div className="border-b-2 border-gray-700 h-5">
                </div>
                <div className="flex min-h-0 flex-1">
                    <div className="bg-brand-gray w-[40%] text-gray-200 font-bold border-r-2 border-gray-700 flex min-h-0 flex-col">
                        <h1 className="flex m-5">
                            <GitCommitHorizontal className="mr-2" />
                            Commits
                        </h1>
                        <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto custom-scrollbar px-4 pb-5">
                            {commits.map((commit, index) => (
                                <div key={index} className="w-full">
                                    <CommitCard index={index} username={commit.player_id} isFirst={index === 0} isLast={index === commits.length - 1} selected={index === selectedCommit} handleCommitClick={handleCommitClick} />
                                </div>
                            ))}
                        </div>

                    </div>
                    {selectedCommit !== -1 ? (
                        <Editor
                            height="600px"
                            width="60%"
                            defaultLanguage="python"
                            value={commits?.[selectedCommit]?.code}
                            theme="vs-dark"
                            options={{
                                readOnly: true
                            }}
                        />)
                        :
                        (<div className="flex min-h-0 flex-1 items-center justify-center text-center w-[60%] text-gray-500 text-lg bg-brand-gray-light">
                            <div className="m-10">
                                The problem has been solved! Review the code snapshots carefully, select the commit files to inspect changes, then vote for the player you think was the imposter.
                                Remember — look for suspicious edits, unusual patterns, and don’t be fooled!
                            </div>
                        </div>)}
                </div>
                <div className="flex h-15 shrink-0 justify-end border-t-2 border-gray-700 bg-brand-gray"></div>
            </div>
        </>
    );
}