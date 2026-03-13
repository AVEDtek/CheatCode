import { useSocket } from "../contexts/SocketContext.tsx";

import { useState } from "react";

import { useRoom } from "../contexts/RoomContext.tsx";
import { useGame } from "../contexts/GameContext.tsx";

export default function ProblemPanel() {
    const {
        isConnected,
        send
    } = useSocket();

    const [activeTab, setActiveTab] = useState<"problem" | "chatroom">("problem");
    const [message, setMessage] = useState<string>("");

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

    if (!problem || problem.title === "" || problem.description === "" || problem.difficulty === "") {
        return null;
    }

    const canSend = message.trim().length > 0;

    return (
        <>
            <div className="w-[35%] min-w-[315px] max-h-[85vh] bg-brand-gray rounded-xl my-3 border-2 border-gray-700 flex min-h-0 flex-col self-stretch">
                <div className="border-b border-gray-700 px-4 pt-4">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab("problem")}
                            className={`cursor-pointer rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${activeTab === "problem"
                                ? "bg-brand-gray-light text-gray-100"
                                : "text-gray-400 hover:bg-brand-gray-light/60 hover:text-gray-200"
                                }`}
                        >
                            Problem
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("chatroom")}
                            className={`cursor-pointer rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${activeTab === "chatroom"
                                ? "bg-brand-gray-light text-gray-100"
                                : "text-gray-400 hover:bg-brand-gray-light/60 hover:text-gray-200"
                                }`}
                        >
                            Chatroom
                        </button>
                    </div>
                </div>
                {activeTab === "problem" ? (
                    username === imposter ?
                        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
                            <h1 className="flex text-gray-200 font-bold m-7 text-2xl">
                                You are the Imposter!
                            </h1>
                            <div className="text-gray-400 m-7">
                                Your goal is to blend in and guess what everyone else is solving without getting caught.
                                Pay close attention, act naturally, and don’t let them suspect you!
                                <br />
                                <br />
                                <strong className="text-gray-300">Hint:</strong>
                                <div className="bg-brand-gray-light p-3 m-2 rounded-xl font-mono text-sm">
                                    {problem.topics.map((topic: string, index: number) => (
                                        <div key={index}>
                                            {topic}
                                        </div>
                                    )) ?? []}
                                </div>
                            </div>
                        </div>
                        :
                        <div className="min-h-0 flex flex-1 flex-col">
                            <h1 className="text-gray-200 font-bold mx-7 mt-7 mb-2 text-2xl">
                                {problem.title}
                            </h1>
                            <div className="mb-5 text-xs ml-7">
                                {problem.difficulty === "Easy" && <span className="bg-green-500/30 text-green-500 px-2 py-1 rounded-full ">Easy</span>}
                                {problem.difficulty === "Medium" && <span className="bg-yellow-500/30 text-yellow-500 px-2 py-1 rounded-full ">Medium</span>}
                                {problem.difficulty === "Hard" && <span className="bg-red-500/30 text-red-500 px-2 py-1 rounded-full ">Hard</span>}
                            </div>
                            <div className="mx-7 mb-7 min-h-0 flex-1 overflow-y-auto text-gray-400 custom-scrollbar">
                                {problem.description}
                                <br />
                                <br />
                                {problem.examples.map((example: string, index: number) => (
                                    <div key={index}>
                                        <strong className="text-gray-300">Example {index + 1}:</strong>
                                        <pre className="bg-brand-gray-light p-3 m-2 rounded-xl whitespace-pre-wrap text-sm font-mono text-gray-400">
                                            {example}
                                        </pre>
                                    </div>
                                ))}
                                <br />
                                <ul className="list-disc">
                                    <strong className="text-gray-300">Constraints:</strong>
                                    {problem.constraints.map((constraint: string, index: number) => (
                                        <li key={index} className="m-2 ml-7 text-gray-400">
                                            {constraint}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                ) : (
                    <div className="min-h-0 flex flex-1 flex-col px-5 py-5">
                        <div className="mb-4 rounded-xl border border-gray-700 bg-brand-gray-light/60 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Room</p>
                                    <h2 className="text-base font-semibold text-gray-100">{roomId || "Lobby"}</h2>
                                </div>
                                <div className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-400">
                                    {players.length} online
                                </div>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                            {chat.map((message: any, index: number) => {
                                if (message.sender === "System") {
                                    return (
                                        <div key={`${message.time}-${index}`} className="flex justify-center">
                                            <span className="rounded-full bg-gray-700/60 px-3 py-1 text-xs text-gray-400">
                                                {message.message}
                                            </span>
                                        </div>
                                    );
                                }

                                const isOwnMessage = message.sender === username;

                                return (
                                    <div key={`${message.time}-${index}`} className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[85%] rounded-xl px-3 py-2 ${isOwnMessage ? "bg-blue-500/20 border border-blue-500/35" : "bg-brand-gray-light border border-gray-700"}`}>
                                            <div className="mb-1 flex items-center gap-2 text-xs">
                                                <span className={`font-semibold ${isOwnMessage ? "text-blue-300" : "text-gray-300"}`}>
                                                    {isOwnMessage ? "You" : message.sender}
                                                </span>
                                                <span className="text-gray-500">{message.timestamp}</span>
                                            </div>
                                            <p className="whitespace-pre-wrap break-words text-sm text-gray-200">{message.message}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <form className="mt-4 flex items-end gap-3">
                            <div className="flex-1">
                                <textarea
                                    id="chat-message"
                                    value={message}
                                    onChange={(event) => setMessage(event.target.value)}
                                    placeholder="Drop a hint or ask a question..."
                                    className="w-full min-h-[50px] resize-none rounded-xl border border-gray-700 bg-brand-gray-light px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none transition custom-scrollbar"
                                    rows={1}
                                    maxLength={200}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={onSendClick}
                                className={`cursor-pointer w-20 m-2 p-3 rounded-xl font-bold text-sm text-gray-200 bg-purple-700 ${canSend ? 'hover:bg-purple-600' : ''} transition-colors duration-300 disabled:cursor-default disabled:opacity-75`}
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