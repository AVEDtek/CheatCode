import { useGame } from "../contexts/GameContext.tsx";

export default function ImposterPanel() {
    const { problem } = useGame()

    if (!problem) {
        return null;
    }

    return (
        <>
            <div className="w-[35%] min-w-[315px] max-h-[85vh] bg-brand-gray rounded-xl my-3 border-2 border-gray-700">
                <h1 className="flex text-gray-200 font-bold m-7 text-2xl">
                    You are the&nbsp; <strong className="text-red-700"> Imposter </strong>
                </h1>
                <div className="text-gray-400 m-7">
                    Your goal is to blend in and guess what everyone else is solving without getting caught.
                    Pay close attention, act naturally, and don’t let them suspect you!
                    <br />
                    <br />
                    <strong className="text-gray-300">Hint:</strong>
                    <div className="bg-brand-gray-light p-3 m-2 rounded-xl">
                        {problem.topics.map((topic, index) => (
                            <div key={index}>
                                {topic}
                            </div>
                        )) ?? []}
                    </div>
                </div>


            </div>
        </>
    );
}