import { GitCommitHorizontal } from "lucide-react";

import { useState } from "react";

import Editor, { DiffEditor } from "@monaco-editor/react";
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

    const selectedCode = selectedCommit >= 0 ? commits[selectedCommit].code : "";
    const previousCode = selectedCommit >= 0 ? (selectedCommit === 0 ? commits[selectedCommit].code : commits[selectedCommit - 1].code) : "";

    return (
        <>
            <div className="w-[50%] max-h-[85vh] min-w-[450px] rounded-2xl bg-brand-gray border-2 border-gray-700 m-3 flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="border-b border-gray-700 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-5 bg-purple-600 rounded-full" />
                            <h2 className="text-gray-100 text-sm font-bold uppercase tracking-widest">Commit Review</h2>
                        </div>
                        <span className="text-xs font-semibold rounded-full px-2.5 py-1 bg-gray-800 text-gray-400">
                            {commits.length} snapshots
                        </span>
                    </div>
                </div>
                <div className="flex min-h-0 flex-1">
                    <div className="bg-brand-gray w-[40%] text-gray-200 border-r border-gray-700 flex min-h-0 flex-col">
                        <h1 className="flex items-center m-4 mb-3 text-sm uppercase tracking-widest font-bold text-gray-300">
                            <GitCommitHorizontal className="mr-2" size={16} />
                            Commits
                        </h1>
                        <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto custom-scrollbar px-4 pb-4 gap-2">
                            {commits.map((commit, index) => (
                                <div key={index} className="w-full">
                                    <CommitCard index={index} username={commit.player_id} isFirst={index === 0} isLast={index === commits.length - 1} selected={index === selectedCommit} handleCommitClick={handleCommitClick} />
                                </div>
                            ))}
                        </div>

                    </div>
                    {selectedCommit !== -1 ? (
                        <div className="w-[60%] min-h-0 bg-brand-gray-light/30">
                            {selectedCommit === 0 ? (
                                <Editor
                                    height="100%"
                                    width="100%"
                                    defaultLanguage="python"
                                    value={selectedCode}
                                    theme="vs-dark"
                                    options={{
                                        readOnly: true,
                                        minimap: { enabled: false }
                                    }}
                                />
                            ) : (
                                <DiffEditor
                                    height="100%"
                                    width="100%"
                                    language="python"
                                    original={previousCode}
                                    modified={selectedCode}
                                    theme="vs-dark"
                                    options={{
                                        readOnly: true,
                                        originalEditable: false,
                                        renderSideBySide: true,
                                        minimap: { enabled: false },
                                        wordWrap: "on",
                                        diffWordWrap: "on",
                                        scrollBeyondLastLine: false,
                                        ignoreTrimWhitespace: false
                                    }}
                                />
                            )}
                        </div>)
                        :
                        (<div className="flex min-h-0 flex-1 items-center justify-center text-center w-[60%] p-8 bg-brand-gray-light/30">
                            <div className="max-w-md rounded-2xl border border-gray-700 bg-brand-gray-light/50 px-6 py-8">
                                <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 mb-2">Review Mode</p>
                                <p className="text-gray-300 text-lg font-semibold">
                                    Pick a commit snapshot to inspect
                                </p>
                                <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                                    Compare coding patterns, look for suspicious edits, and decide who played like the imposter.
                                </p>
                            </div>
                        </div>)}
                </div>
                <div className="flex h-16 min-h-16 shrink-0 justify-end border-t border-gray-700 bg-brand-gray" />
            </div>
        </>
    );
}