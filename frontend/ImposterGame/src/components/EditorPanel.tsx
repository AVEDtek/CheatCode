import { useSocket } from "../contexts/SocketContext.tsx";
import { useRoom } from "../contexts/RoomContext.tsx";
import { useGame } from "../contexts/GameContext.tsx";

import { useState } from "react";

import Editor from "@monaco-editor/react";
import ConsolePanel from "./ConsolePanel.tsx";

import { ChevronUp, ChevronDown } from "lucide-react";

export default function EditorPanel() {
    const { isConnected, send } = useSocket();
    const { roomId, username } = useRoom();
    const { currentPlayer, code, setCode } = useGame();

    const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);
    const [editorHeight, setEditorHeight] = useState<number>(75);
    const [consoleHeight, setConsoleHeight] = useState<number>(0);

    const handleEditorChange = (code: string | undefined) => {
        if (code !== undefined) {
            setCode(code);
        }
    };

    const runCode = () => {
        if (!isConnected) {
            console.error("Socket not connected");
            return;
        }
        const request = {
            type: "run-test-cycle",
            roomId: roomId,
            playerId: username,
            code: code
        }
        send(request);
        if (!isConsoleOpen) {
            toggleConsole();
        }
    };

    const toggleConsole = () => {
        if (!isConsoleOpen) {
            setIsConsoleOpen(true);
            setEditorHeight(50);
            setConsoleHeight(25);
        } else {
            setIsConsoleOpen(false);
            setEditorHeight(75);
            setConsoleHeight(0);
        }
    };

    const handleConsoleResize = (newHeight: number) => {
        setConsoleHeight(newHeight);
        setEditorHeight(75 - newHeight);
    };

    return (
        <>
            <div className="w-[50%] min-w-[450px] max-h-[85vh] rounded-xl bg-brand-gray border-2 border-gray-700 m-3 flex flex-col flex-1">
                <div className="border-b-2 border-gray-700 h-5"></div>
                {currentPlayer === username ? (
                    <div>
                        <Editor
                            height={`${editorHeight}vh`}
                            width="100%"
                            defaultLanguage="python"
                            defaultValue="// Start coding..."
                            theme="vs-dark"
                            value={code}
                            onChange={handleEditorChange}
                        />
                        <ConsolePanel
                            height={consoleHeight}
                            isOpen={isConsoleOpen}
                            onResize={handleConsoleResize}
                        />
                        <div className="flex justify-between border-t-2 border-gray-700 h-[60px] bg-brand-gray">
                            <div
                                className="text-gray-400 m-3 p-1 rounded-xl cursor-pointer hover:bg-gray-800"
                                onClick={toggleConsole}
                            >
                                Console{" "}
                                {isConsoleOpen ? (
                                    <ChevronDown className="inline" />
                                ) : (
                                    <ChevronUp className="inline" />
                                )}
                            </div>
                            <button
                                onClick={runCode}
                                className="cursor-pointer w-20 m-2 p-3 rounded-xl font-bold text-sm text-gray-200 bg-purple-700 hover:bg-purple-600 transition-colors duration-300"
                            >
                                Run
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-1 flex-col bg-brand-gray">
                        <div className="flex flex-1 items-center justify-center text-center text-gray-500 text-lg bg-brand-gray-light">
                            <div className="m-10">
                                It’s {currentPlayer}’s turn. Sit tight and see
                                what they write...
                            </div>
                        </div>
                        <div className="flex h-15 shrink-0 justify-end border-t-2 border-gray-700 bg-brand-gray"></div>
                    </div>
                )}
            </div>
        </>
    );
}