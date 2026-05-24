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
            <button
                type="button"
                className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl cursor-pointer min-w-[110px] border text-sm font-semibold transition-all duration-200 ${highlight
                    ? "bg-purple-700/30 border-purple-500/40 text-white"
                    : "bg-brand-gray-light/40 border-gray-700 text-gray-300 hover:bg-brand-gray-light hover:border-gray-600"}`}
                onClick={() => handleCardClick(index)}
            >
                {passed !== undefined ? (
                    passed ? <Check size={15} className="text-green-400" /> : <X size={15} className="text-red-400" />
                ) : null}
                <span>Test {index + 1}</span>
            </button>
        </>
    );
}