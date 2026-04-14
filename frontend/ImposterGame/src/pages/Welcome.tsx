import { useState } from "react";

import Info from "../components/Info.tsx";
import JoinForm from "../components/JoinForm.tsx";
import CreateForm from "../components/CreateForm.tsx"

import { Github, CircleQuestionMark } from "lucide-react";

export default function Welcome() {
    const [isJoinOpen, setIsJoinOpen] = useState<boolean>(false);
    const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
    const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);

    return (
        <>
            <div className="h-screen bg-brand-black flex flex-col">
                <div className="flex justify-between items-center px-5 pt-5">
                    <button
                        type="button"
                        onClick={() => setIsInfoOpen(true)}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-all duration-200 cursor-pointer"
                        title="How to play"
                    >
                        <CircleQuestionMark size={22} />
                    </button>
                    <a
                        href="https://github.com/AbdouMurad/ImposterGame"
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-all duration-200"
                        title="View on GitHub"
                    >
                        <Github size={22} />
                    </a>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
                    <div className="flex flex-col items-center gap-3">
                        <h1 className="text-5xl font-extrabold tracking-tight">
                            <span className="text-purple-500">Cheat</span><span className="text-white">Code</span>
                        </h1>
                        <p className="text-gray-500 text-sm text-center max-w-xs leading-relaxed">
                            A social deduction game for coders. One imposter. One problem. Can you blend in?
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 w-full max-w-xs">
                        <button
                            type="button"
                            onClick={() => setIsCreateOpen(true)}
                            className="cursor-pointer w-full py-3 rounded-xl font-bold text-sm text-white bg-purple-700 hover:bg-purple-600 active:scale-95 transition-all duration-200">
                            Create Room
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsJoinOpen(true)}
                            className="cursor-pointer w-full py-3 rounded-xl font-bold text-sm text-gray-300 border border-gray-700 hover:border-gray-500 hover:text-gray-100 active:scale-95 transition-all duration-200">
                            Join Room
                        </button>
                    </div>
                </div>
            </div>
            {isJoinOpen && <JoinForm onCancelJoinClick={() => setIsJoinOpen(false)} />}
            {isInfoOpen && <Info onInfoExitClick={() => setIsInfoOpen(false)} />}
            {isCreateOpen && <CreateForm onCancelCreateClick={() => setIsCreateOpen(false)} />}
        </>
    );
}