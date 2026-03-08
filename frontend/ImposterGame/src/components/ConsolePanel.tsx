import { useState, useEffect } from "react";

import { GripHorizontal } from "lucide-react";

import TestCard from "./TestCard.tsx";

import { useGame } from "../contexts/GameContext.tsx";

type ConsolePanelProps = {
    height: number;
    onResize: (newHeight: number) => void;
};

export default function ConsolePanel({ height, onResize }: ConsolePanelProps) {
    const [highlightedCard, setHighlightedCard] = useState(0);

    const { testCycle } = useGame();

    const [isResizing, setIsResizing] = useState(false);

    const handleCardClick = (index: number) => {
        setHighlightedCard(index)
    };

    const handleMouseDown = () => {
        setIsResizing(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isResizing) {
            const newHeight = Math.min(500, Math.max(100, height - e.movementY));
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
                className="bg-gray-950 text-gray-200 border-t-2 border-gray-700 overflow-y-auto custom-scrollbar"
                style={{ height: `${height}px` }}
            >
                <div
                    className="flex justify-center cursor-row-resize h-1"
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                >
                    <GripHorizontal />
                </div>
                <div className="mt-5 mx-5 text-gray-200 text-xl font-bold">
                    Test Cases
                </div>
                <div className="flex">
                    {problemTests.map((test, index) => (
                        <div key={index}>
                            <TestCard index={index} highlight={index === highlightedCard} handleCardClick={handleCardClick} />
                        </div>
                    ))}
                </div>
                <div className="m-5">
                    <strong className="text-gray-300">Input:</strong>
                    <div className="bg-gray-900 p-3 rounded-xl mt-2">
                        {/* TODO */}
                    </div>
                </div>

                <div className="m-5">
                    <strong className="text-gray-300">Output:</strong>
                    <div className="bg-gray-900 p-3 rounded-xl mt-2">
                        {/* TODO */}
                    </div>
                </div>

                <div className="m-5">
                    <strong className="text-gray-300">Expected result:</strong>
                    <div className="bg-gray-900 p-3 rounded-xl mt-2">
                        {/* TODO */}
                    </div>
                </div>
            </div>
        </>
    );
}