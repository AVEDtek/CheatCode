import { useGame } from "../contexts/GameContext.tsx";

export default function ProblemPanel() {
    const { problem } = useGame();

    if (!problem || problem.title === "" || problem.description === "") {
        return null;
    }

    return (
        <>
            <div className="w-[35%] bg-gray-950 rounded-xl my-3 border-2 border-gray-700">
                <h1 className="text-gray-200 font-bold m-7 text-2xl">
                    {problem.title}
                </h1>
                <div className="text-gray-400 m-7">
                    {problem.description}
                    <br />
                    <br />
                    {problem.examples.map((example, index) => (
                        <div key={index} >
                            <strong className="text-gray-300">Example {index + 1}:</strong>
                            <div className="bg-gray-900 p-3 m-2 rounded-xl">
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