import { Check, X } from "lucide-react";

type TestCardProps = {
    index: number;
    passed?: boolean;
    highlight: boolean;
    handleCardClick: (index: number) => void;
}

export default function TestCard({ index, passed, highlight, handleCardClick }: TestCardProps) {
    return (
        <>
            <div
                className={`flex justify-center text-gray-300 m-3 py-2 px-5 rounded-xl cursor-pointer w-30 transition-colors duration-300 ${highlight ? "bg-brand-gray-light" : "bg-brand-gray"} hover:bg-brand-gray-light`}
                onClick={() => handleCardClick(index)}
            >
                {passed !== undefined ? (passed ? <Check className="inline-block mr-2 text-green-500" /> : <X className="inline-block mr-2 text-red-500" />) : null}
                Test {index + 1}
            </div>
        </>
    );
}