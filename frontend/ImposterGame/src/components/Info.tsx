import { X } from "lucide-react";

type InfoProps = {
    onInfoExitClick: () => void;
};

export default function Info({ onInfoExitClick }: InfoProps) {
    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
                <div className="relative border border-gray-700 bg-brand-gray w-full max-w-2xl rounded-2xl shadow-xl">
                    <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-700">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-5 bg-purple-600 rounded-full" />
                            <h1 className="text-xl text-gray-100 font-bold">About CheatCode</h1>
                        </div>
                        <button
                            type="button"
                            className="cursor-pointer rounded-xl p-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-all duration-200"
                            onClick={onInfoExitClick}
                            aria-label="Close info panel"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="px-6 py-5 space-y-4 text-sm text-gray-400 leading-relaxed">
                        <p>
                            CheatCode is a social deduction coding game. Everyone appears to solve the same problem,
                            but one player is the imposter and never sees the full prompt.
                        </p>

                        <div className="rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4 space-y-3">
                            <p className="text-xs uppercase tracking-widest font-semibold text-gray-500">How A Round Works</p>
                            <p>1. Players discuss and share clues while coding.</p>
                            <p>2. The imposter improvises and tries to blend in.</p>
                            <p>3. Everyone votes on who seems suspicious.</p>
                        </div>

                        <div className="rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4 space-y-2">
                            <p className="text-xs uppercase tracking-widest font-semibold text-gray-500">Win Conditions</p>
                            <p>Crew wins by correctly identifying the imposter.</p>
                            <p>Imposter wins by surviving the vote or misdirecting the room.</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}