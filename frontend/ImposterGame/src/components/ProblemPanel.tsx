import { useGame } from "../contexts/GameContext.tsx";

export default function ProblemPanel() {
    const { problem } = useGame();

    if (!problem || problem.title === "" || problem.description === "") {
        return null;
    }

    return (
        <>
            <div className="max-w-[35%] min-w-[315px] max-h-[85vh] bg-brand-gray rounded-xl my-3 border-2 border-gray-700 flex min-h-0 flex-col flex-1 self-stretch">
                <h1 className="text-gray-200 font-bold m-7 text-2xl">
                    {problem.title}
                </h1>
                <div className="mx-7 mb-7 min-h-0 flex-1 overflow-y-auto text-gray-400 custom-scrollbar">
                    {problem.description}
                    <br />
                    <br />
                    {problem.examples.map((example, index) => (
                        <div key={index} >
                            <strong className="text-gray-300">Example {index + 1}:</strong>
                            <div className="bg-brand-gray-light p-3 m-2 rounded-xl">
                                {example}
                            </div>
                        </div>
                    ))}
                    <br />
                    <ul className="list-disc">
                        <strong className="text-gray-300">Constraints:</strong>
                        {problem.constraints.map((constraint, index) => (
                            <li key={index} className="m-2 ml-7 text-gray-400">
                                {constraint}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </>
    );
}