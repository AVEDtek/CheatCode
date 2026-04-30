import { useSocket } from "../contexts/SocketContext.tsx";
import { useRoom } from "../contexts/RoomContext.tsx";
import { useGame } from "../contexts/GameContext.tsx";

import { useState, useEffect, useRef, useCallback } from "react";

import Editor from "@monaco-editor/react";
import type { editor as MonacoEditor, IDisposable } from "monaco-editor";
import ConsolePanel from "./ConsolePanel.tsx";

import { ChevronUp, ChevronDown } from "lucide-react";

export default function EditorPanel() {
    const { isConnected, send, onMessage } = useSocket();
    const { roomId, username } = useRoom();
    const { currentPlayer, code, setCode } = useGame();

    const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);
    const [editorHeight, setEditorHeight] = useState<number>(100);
    const [consoleHeight, setConsoleHeight] = useState<number>(0);
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [remoteCursor, setRemoteCursor] = useState<{ playerId: string; line: number; column: number } | null>(null);

    const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
    const monacoRef = useRef<any>(null);
    const cursorListenerRef = useRef<IDisposable | null>(null);
    const decorationIdsRef = useRef<string[]>([]);
    const lastSentCursorRef = useRef<string>("");

    const clearRemoteCursorDecorations = useCallback(() => {
        if (!editorRef.current) {
            decorationIdsRef.current = [];
            return;
        }
        decorationIdsRef.current = editorRef.current.deltaDecorations(decorationIdsRef.current, []);
    }, []);

    const applyRemoteCursorDecorations = useCallback(() => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;

        if (!editor || !monaco || !remoteCursor || currentPlayer === username || remoteCursor.playerId !== currentPlayer) {
            clearRemoteCursorDecorations();
            return;
        }

        const range = new monaco.Range(remoteCursor.line, remoteCursor.column, remoteCursor.line, remoteCursor.column);
        decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, [
            {
                range,
                options: {
                    isWholeLine: true,
                    className: "remote-cursor-line",
                },
            },
            {
                range,
                options: {
                    beforeContentClassName: "remote-cursor-caret",
                },
            },
        ]);
    }, [clearRemoteCursorDecorations, currentPlayer, remoteCursor, username]);

    const sendCursorUpdate = useCallback((line: number, column: number) => {
        if (!isConnected || currentPlayer !== username) {
            return;
        }

        const cursorKey = `${line}:${column}`;
        if (lastSentCursorRef.current === cursorKey) {
            return;
        }
        lastSentCursorRef.current = cursorKey;

        send({
            type: "cursor-update",
            roomId,
            playerId: username,
            line,
            column,
        });
    }, [currentPlayer, isConnected, roomId, send, username]);

    const attachCursorListener = useCallback(() => {
        cursorListenerRef.current?.dispose();
        cursorListenerRef.current = null;

        const editor = editorRef.current;
        if (!editor || currentPlayer !== username) {
            return;
        }

        const currentPosition = editor.getPosition();
        if (currentPosition) {
            sendCursorUpdate(currentPosition.lineNumber, currentPosition.column);
        }

        cursorListenerRef.current = editor.onDidChangeCursorPosition((event) => {
            sendCursorUpdate(event.position.lineNumber, event.position.column);
        });
    }, [currentPlayer, sendCursorUpdate, username]);

    const handleEditorMount = useCallback((editor: MonacoEditor.IStandaloneCodeEditor, monaco: any) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        attachCursorListener();
        applyRemoteCursorDecorations();
    }, [applyRemoteCursorDecorations, attachCursorListener]);

    useEffect(() => {
        const unsubTestResults = onMessage("test-results", () => setIsRunning(false));
        const unsubTestsRunning = onMessage("tests-running", () => setIsRunning(false));
        const unsubCursorUpdate = onMessage("cursor-update", (data) => {
            if (typeof data?.line !== "number" || typeof data?.column !== "number" || !data?.playerId) {
                return;
            }
            setRemoteCursor({
                playerId: data.playerId,
                line: data.line,
                column: data.column,
            });
        });
        const unsubGameSync = onMessage("game-sync", (data) => {
            const cursor = data?.cursor;
            if (!cursor || typeof cursor?.line !== "number" || typeof cursor?.column !== "number" || !cursor?.playerId) {
                return;
            }
            setRemoteCursor({
                playerId: cursor.playerId,
                line: cursor.line,
                column: cursor.column,
            });
        });
        return () => {
            unsubTestResults();
            unsubTestsRunning();
            unsubCursorUpdate();
            unsubGameSync();
        };
    }, [onMessage]);

    useEffect(() => {
        attachCursorListener();
    }, [attachCursorListener]);

    useEffect(() => {
        applyRemoteCursorDecorations();
    }, [applyRemoteCursorDecorations]);

    useEffect(() => {
        if (currentPlayer === username) {
            clearRemoteCursorDecorations();
            setRemoteCursor(null);
        }
    }, [clearRemoteCursorDecorations, currentPlayer, username]);

    useEffect(() => {
        return () => {
            cursorListenerRef.current?.dispose();
            cursorListenerRef.current = null;
            clearRemoteCursorDecorations();
            editorRef.current = null;
            monacoRef.current = null;
        };
    }, [clearRemoteCursorDecorations]);

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
        if (!isConnected || isRunning) {
            console.error("Socket not connected or tests already running");
            return;
        }
        const request = {
            type: "run-tests",
            roomId: roomId,
            playerId: username,
            code: code
        }
        setIsRunning(true);
        send(request);
        if (!isConsoleOpen) {
            toggleConsole();
        }
    };

    const toggleConsole = () => {
        if (!isConsoleOpen) {
            setIsConsoleOpen(true);
            setEditorHeight(65);
            setConsoleHeight(35);
        } else {
            setIsConsoleOpen(false);
            setEditorHeight(100);
            setConsoleHeight(0);
        }
    };

    const handleConsoleResize = (newHeight: number) => {
        setConsoleHeight(newHeight);
        setEditorHeight(100 - newHeight);
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
                        <div className="min-h-0" style={{ height: `${editorHeight}%` }}>
                            <Editor
                                height="100%"
                                width="100%"
                                defaultLanguage="python"
                                defaultValue="// Start coding..."
                                theme="vs-dark"
                                value={code}
                                onChange={handleEditorChange}
                                onMount={handleEditorMount}
                            />
                        </div>
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
                                disabled={isRunning}
                                className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all duration-200 ${
                                    isRunning
                                        ? "cursor-not-allowed bg-purple-900 opacity-50"
                                        : "cursor-pointer bg-purple-700 hover:bg-purple-600 active:scale-95"
                                }`}
                            >
                                {isRunning ? "Running..." : "Run"}
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
                                onMount={handleEditorMount}
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