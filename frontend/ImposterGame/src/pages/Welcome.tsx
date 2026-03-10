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
            <div className="h-screen bg-gray-950 flex flex-col">
                <div className="flex justify-between">
                    <button
                        type="button"
                        onClick={() => setIsInfoOpen(true)}
                        className="m-5 p-2 rounded-xl text-gray-200 bg-purple-700 hover:bg-purple-600 transition-colors duration-300 cursor-pointer">
                        <CircleQuestionMark size={24} />
                    </button>
                    <a
                        href="https://github.com/AbdouMurad/ImposterGame"
                        className="m-5 p-2 rounded-xl text-gray-200 bg-purple-700 hover:bg-purple-600 transition-colors duration-300"
                    >
                        <Github size={24} />
                    </a>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center">
                    <header className="text-gray-200 text-4xl font-extrabold">
                        <h1 className="text-purple-700">
                            Cheet
                            <strong className="text-white">Code</strong>
                        </h1>
                    </header>

                    <div className="flex mt-10">
                        <button
                            type="button"
                            onClick={() => setIsJoinOpen(true)}
                            className="cursor-pointer w-30 m-2 p-3 rounded-xl font-bold text-sm text-gray-200 bg-purple-700 hover:bg-purple-600 transition-colors duration-300">
                            Join Room
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsCreateOpen(true)}
                            className="cursor-pointer w-30 m-2 p-3 rounded-xl font-bold text-sm text-gray-200 bg-purple-700 hover:bg-purple-600 transition-colors duration-300">
                            Create Room
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