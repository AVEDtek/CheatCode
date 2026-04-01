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

            if (!isConnected) {
                console.error("Socket not connected");
                return;
            }
            const request = {
                type: "new-code",
                roomId: roomId,
                code: code
            };
            send(request);
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
            <div className="w-[50%] min-w-[450px] max-h-[85vh] rounded-2xl bg-brand-gray border-2 border-gray-700 m-3 flex flex-col flex-1 overflow-hidden">
                <div className="border-b border-gray-700 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-5 bg-purple-600 rounded-full" />
                            <h2 className="text-gray-100 text-sm font-bold uppercase tracking-widest">Editor</h2>
                        </div>
                        <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${currentPlayer === username ? "bg-green-500/10 text-green-400" : "bg-gray-800 text-gray-400"}`}>
                            {currentPlayer === username ? "Your Turn" : `${currentPlayer}'s Turn`}
                        </span>
                    </div>
                </div>
                {currentPlayer === username ? (
                    <div className="flex flex-1 flex-col min-h-0">
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
                        <div className="flex items-center justify-between border-t border-gray-700 h-16 min-h-16 shrink-0 bg-brand-gray px-3">
                            <button
                                type="button"
                                className="cursor-pointer text-gray-300 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors duration-200"
                                onClick={toggleConsole}
                            >
                                Console {isConsoleOpen ? <ChevronDown className="inline" size={16} /> : <ChevronUp className="inline" size={16} />}
                            </button>
                            <button
                                type="button"
                                onClick={runCode}
                                className="cursor-pointer px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-purple-700 hover:bg-purple-600 active:scale-95 transition-all duration-200"
                            >
                                Run
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-1 flex-col bg-brand-gray min-h-0">
                        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-2 bg-brand-gray-light/30">
                            <p className="text-xs uppercase tracking-widest font-semibold text-gray-500">Live View</p>
                            <p className="text-sm font-semibold text-gray-300">
                                {currentPlayer} is coding
                            </p>
                        </div>
                        <div className="flex-1 min-h-0">
                            <Editor
                                height="100%"
                                width="100%"
                                defaultLanguage="python"
                                theme="vs-dark"
                                value={code}
                                options={{
                                    readOnly: true,
                                    minimap: { enabled: false }
                                }}
                            />
                        </div>
                        <div className="flex h-16 min-h-16 shrink-0 justify-end border-t border-gray-700 bg-brand-gray" />
                    </div>
                )}
            </div>
        </>
    );
}