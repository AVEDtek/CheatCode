import { useGame } from "../contexts/GameContext.tsx";
import { useSocket } from "../contexts/SocketContext.tsx";

import { useState, useEffect } from "react";

import TestCard from "./TestCard.tsx";

import { GripHorizontal } from "lucide-react";

type ConsolePanelProps = {
    height: number;
    isOpen: boolean;
    onResize: (newHeight: number) => void;
};

export default function ConsolePanel({ height, isOpen, onResize }: ConsolePanelProps) {
    const { onMessage } = useSocket();
    const { tests } = useGame();

    const [isResizing, setIsResizing] = useState<boolean>(false);
    const [highlightedCard, setHighlightedCard] = useState<number>(0);
    const [error, setError] = useState<boolean>(false);
    const [outputs, setOutputs] = useState<any[]>([]);
    const [passed, setPassed] = useState<boolean[]>([]);

    const selectedTest = tests?.[highlightedCard];
    const selectedOutput = outputs?.[highlightedCard];

    const formatOutput = (value: any) => {
        return value
            .replace(/\\r\\n/g, "\n")
            .split("\n")
            .map((line: string) => line.trim())
            .filter(Boolean)
            .join("\n");
    };

    useEffect(() => {
        const unsubTestResults = onMessage("test-results", (data) => {
            setError(data.error);
            setOutputs(data.outputList);
            setPassed(data.passedList);
        });

        return () => unsubTestResults();
    }, [onMessage]);

    const handleCardClick = (index: number) => {
        setHighlightedCard(index)
    };

    const handleMouseDown = () => {
        setIsResizing(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isResizing) {
            const deltaVh = (e.movementY / window.innerHeight) * 100;
            const newHeight = Math.min(45, Math.max(5, height - deltaVh));
            onResize(newHeight);
        }
    };

    const handleMouseUp = () => {
        setIsResizing(false);
    };

    useEffect(() => {
        if (isResizing) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        } else {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing, handleMouseMove, handleMouseUp]);

    return (
        <>
            <div
                className={`min-h-0 shrink-0 overflow-y-auto overflow-x-hidden bg-brand-gray text-gray-200 border-gray-700 custom-scrollbar ${isOpen ? "border-t" : "border-0"}`}
                style={{ height: `${height}%` }}
            >
                <div
                    className="flex items-center justify-center cursor-row-resize h-5 text-gray-500 hover:text-gray-300 transition-colors duration-200"
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                >
                    <GripHorizontal size={16} />
                </div>
                <div className="px-4 pb-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-5 bg-purple-600 rounded-full" />
                            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-100">Test Console</h3>
                        </div>
                        <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${error ? "bg-red-500/10 text-red-400" : passed.length > 0 ? "bg-green-500/10 text-green-400" : "bg-gray-800 text-gray-400"}`}>
                            {error ? "Runtime Error" : passed.length > 0 ? `${passed.filter(Boolean).length}/${passed.length} Passed` : "Not Run"}
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                        {(tests ?? []).map((_, index) => (

                            <div key={index}>
                                {tests[index].visible ?
                                    (passed.length > 0 ?
                                        <TestCard index={index} passed={passed[index]} highlight={index === highlightedCard} handleCardClick={handleCardClick} /> :
                                        <TestCard index={index} highlight={index === highlightedCard} handleCardClick={handleCardClick} />)
                                    : null}
                            </div>
                        ))}
                    </div>

                    <div className="rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4">
                        <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 mb-2">Input</p>
                        <pre className="bg-brand-gray-light text-gray-300 p-3 rounded-xl min-h-10 font-mono text-sm whitespace-pre-wrap break-words border border-gray-700">
                            {Object.entries(selectedTest?.input ?? {})
                                .map(([key, value]) => `${key}: ${JSON.stringify(value, null, 2)}`)
                                .join(", ")}
                        </pre>
                    </div>

                    <div className="rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4">
                        <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 mb-2">Output</p>
                        {error ?
                            <pre className="max-h-[32vh] overflow-auto custom-scrollbar p-3 rounded-xl min-h-10 whitespace-pre-wrap break-all text-sm font-mono bg-red-950/40 text-red-300 border border-red-900/60">{formatOutput(selectedOutput ?? "")}</pre> :
                            <pre className="max-h-[32vh] overflow-auto custom-scrollbar bg-brand-gray-light text-gray-300 p-3 rounded-xl min-h-10 font-mono text-sm whitespace-pre-wrap break-words border border-gray-700">
                                {JSON.stringify(selectedOutput, null, 2)}
                            </pre>}
                    </div>

                    <div className="rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4">
                        <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 mb-2">Expected Result</p>
                        <pre className="bg-brand-gray-light text-gray-300 p-3 rounded-xl min-h-10 font-mono text-sm whitespace-pre-wrap break-words border border-gray-700">
                            {JSON.stringify(selectedTest?.expected, null, 2)}
                        </pre>
                    </div>
                </div>
            </div>
        </>
    );
}