import { useSocket } from "../contexts/SocketContext.tsx";

import { useEffect, useRef, useState } from "react";

import { useRoom } from "../contexts/RoomContext.tsx";
import { useGame } from "../contexts/GameContext.tsx";

export default function ProblemPanel() {
    const {
        isConnected,
        send
    } = useSocket();

    const [activeTab, setActiveTab] = useState<"problem" | "chatroom">("problem");
    const [message, setMessage] = useState<string>("");
    const chatContainerRef = useRef<HTMLDivElement | null>(null);

    const { roomId, username, players } = useRoom();
    const { imposter, problem, chat } = useGame();

    const onSendClick = () => {
        const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        if (!isConnected) {
            console.error("Socket not connected");
            return;
        }
        const request = {
            type: "send-message",
            roomId: roomId,
            playerId: username,
            message: message,
            timestamp: timestamp,
        };

        send(request);
        setMessage("");
    };

    useEffect(() => {
        if (activeTab !== "chatroom") return;
        const chatContainer = chatContainerRef.current;
        if (!chatContainer) return;

        chatContainer.scrollTop = chatContainer.scrollHeight;
    }, [activeTab, chat]);

    if (!problem || problem.title === "" || problem.description === "" || problem.difficulty === "") {
        return null;
    }

    const canSend = message.trim().length > 0;
    const difficultyStyle = problem.difficulty === "Easy"
        ? "bg-green-500/20 text-green-300 border-green-500/30"
        : problem.difficulty === "Medium"
            ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
            : "bg-red-500/20 text-red-300 border-red-500/30";

    return (
        <>
            <div className="w-[35%] min-w-[315px] max-h-[85vh] bg-brand-gray rounded-2xl my-3 border-2 border-gray-700 flex min-h-0 flex-col self-stretch overflow-hidden">
                <div className="border-b border-gray-700 p-4">
                    <div className="grid grid-cols-2 rounded-xl bg-brand-gray-light/60 p-1 gap-1">
                        <button
                            type="button"
                            onClick={() => setActiveTab("problem")}
                            className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${activeTab === "problem"
                                ? "bg-purple-700 text-white"
                                : "text-gray-400 hover:bg-gray-700/60 hover:text-gray-200"
                                }`}
                        >
                            Problem
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("chatroom")}
                            className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ${activeTab === "chatroom"
                                ? "bg-purple-700 text-white"
                                : "text-gray-400 hover:bg-gray-700/60 hover:text-gray-200"
                                }`}
                        >
                            Chatroom
                        </button>
                    </div>
                </div>

                {activeTab === "problem" ? (
                    username === imposter ? (
                        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-6 text-center">
                                <p className="text-xs uppercase tracking-widest font-semibold text-red-300">Role</p>
                                <h1 className="text-2xl font-bold text-red-200 mt-1">You are the Imposter</h1>
                                <p className="text-sm text-gray-400 mt-2">Blend in, gather clues, and avoid getting voted out.</p>
                            </div>

                            <div className="rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4 space-y-2">
                                <p className="text-xs uppercase tracking-widest font-semibold text-gray-500">Mission</p>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    Speak confidently, ask smart questions, and mirror the group to stay under the radar.
                                </p>
                            </div>

                            <div className="rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4 space-y-3">
                                <p className="text-xs uppercase tracking-widest font-semibold text-gray-500">Topic Hints</p>
                                <div className="flex flex-wrap gap-2">
                                    {(problem.topics ?? []).map((topic: string, index: number) => (
                                        <span
                                            key={index}
                                            className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200"
                                        >
                                            {topic}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="min-h-0 flex flex-1 flex-col p-5 gap-4">
                            <div className="space-y-2">
                                <h1 className="text-gray-100 font-bold text-2xl leading-tight">
                                    {problem.title}
                                </h1>
                                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${difficultyStyle}`}>
                                    {problem.difficulty}
                                </span>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto text-gray-400 custom-scrollbar pr-1 space-y-4">
                                <p className="leading-relaxed">{problem.description}</p>

                                <div className="space-y-3">
                                    {(problem.examples ?? []).map((example: string, index: number) => (
                                        <div key={index}>
                                            <p className="text-gray-300 text-sm font-semibold mb-1">Example {index + 1}</p>
                                            <pre className="bg-brand-gray-light border border-gray-700 p-3 rounded-xl whitespace-pre-wrap text-sm font-mono text-gray-300">
                                                {example}
                                            </pre>
                                        </div>
                                    ))}
                                </div>

                                <div className="rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4">
                                    <p className="text-xs uppercase tracking-widest font-semibold text-gray-500 mb-2">Constraints</p>
                                    <ul className="list-disc pl-5 space-y-1">
                                        {(problem.constraints ?? []).map((constraint: string, index: number) => (
                                            <li key={index} className="text-sm text-gray-400">
                                                {constraint}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="min-h-0 flex flex-1 flex-col px-5 py-5 gap-4 overflow-hidden">
                        <div className="rounded-xl border border-gray-700 bg-brand-gray-light/60 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Room</p>
                                    <h2 className="text-base font-semibold text-gray-100">{roomId || "Lobby"}</h2>
                                </div>
                                <div className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
                                    {(players ?? []).length} online
                                </div>
                            </div>
                        </div>

                        <div ref={chatContainerRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar space-y-3 pr-1 w-full min-w-0">
                            {chat.map((message: any, index: number) => {
                                if (message.sender === "System") {
                                    return (
                                        <div key={`${message.time}-${index}`} className="flex justify-center">
                                            <span className="rounded-full border border-gray-700 bg-gray-700/50 px-3 py-1 text-xs text-gray-400">
                                                {message.message}
                                            </span>
                                        </div>
                                    );
                                }

                                const isOwnMessage = message.sender === username;

                                return (
                                    <div key={`${message.time}-${index}`} className={`flex min-w-0 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[85%] min-w-0 overflow-hidden rounded-xl px-3 py-2 border ${isOwnMessage ? "bg-purple-600/20 border-purple-500/35" : "bg-brand-gray-light border-gray-700"}`}>
                                            <div className="mb-1 flex items-center gap-2 text-xs">
                                                <span className={`font-semibold ${isOwnMessage ? "text-purple-300" : "text-gray-300"}`}>
                                                    {isOwnMessage ? "You" : message.sender}
                                                </span>
                                                <span className="text-gray-500">{message.timestamp}</span>
                                            </div>
                                            <p className="whitespace-pre-wrap break-all text-sm text-gray-200 [overflow-wrap:anywhere]">{message.message}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <form className="flex items-stretch gap-3">
                            <div className="flex-1">
                                <textarea
                                    id="chat-message"
                                    value={message}
                                    onChange={(event) => setMessage(event.target.value)}
                                    placeholder="Drop a hint or ask a question..."
                                    className="w-full h-[50px] resize-none rounded-xl border border-gray-700 bg-brand-gray-light px-3 py-3 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-purple-600 transition-colors duration-200 custom-scrollbar"
                                    rows={1}
                                    maxLength={200}
                                    onKeyDown={(e) => {
                                        if (e.key !== "Enter") return;
                                        if (e.shiftKey) return;
                                        e.preventDefault();
                                        if (message.trim().length > 0) onSendClick();
                                    }}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={onSendClick}
                                className={`cursor-pointer h-[50px] px-5 rounded-xl font-bold text-sm text-white bg-purple-700 ${canSend ? "hover:bg-purple-600 active:scale-95" : ""} transition-all duration-200 disabled:cursor-default disabled:opacity-40`}
                                disabled={!canSend}
                            >
                                Send
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </>
    );
}