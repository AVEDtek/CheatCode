import { useGame } from "../contexts/GameContext.tsx";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Clock } from "lucide-react";

const AUTO_DISMISS_MS = 10000;

export default function CodingOverPanel() {
    const { codingOverReason, dismissCodingOver } = useGame();

    const dismissRef = useRef(dismissCodingOver);
    useEffect(() => {
        dismissRef.current = dismissCodingOver;
    }, [dismissCodingOver]);

    const [remaining, setRemaining] = useState(1);

    useEffect(() => {
        const deadline = Date.now() + AUTO_DISMISS_MS;
        let frame: number;

        const tick = () => {
            const left = deadline - Date.now();
            if (left <= 0) {
                setRemaining(0);
                dismissRef.current();
                return;
            }
            setRemaining(left / AUTO_DISMISS_MS);
            frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, []);

    if (!codingOverReason) {
        return null;
    }

    const solved = codingOverReason === "solved";

    const accent = solved
        ? "border-green-500/30 bg-green-500/10 text-green-300"
        : "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    const iconWrap = solved
        ? "border-green-400/30 bg-green-500/20 text-green-300"
        : "border-yellow-400/30 bg-yellow-500/20 text-yellow-300";
    const bar = solved ? "bg-green-500" : "bg-yellow-500";

    const title = solved ? "Problem Solved!" : "Time's Up!";
    const body = solved
        ? "A submission passed every test, so the coding phase ended early. Head into voting and decide who you think the imposter was."
        : "The coding clock ran out before every test passed. The coding phase is over — head into voting and decide who you think the imposter was.";

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div className="relative z-50 w-full max-w-lg overflow-hidden rounded-3xl border border-gray-700 bg-brand-gray shadow-xl">
                <div className="border-b border-gray-700 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className={`h-5 w-1 rounded-full ${bar}`} />
                        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-100">Coding Phase Complete</h2>
                    </div>
                </div>

                <div className="space-y-4 p-6">
                    <div className={`rounded-2xl border px-5 py-6 text-center ${accent}`}>
                        <div className={`mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border ${iconWrap}`}>
                            {solved ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                        </div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest">{title}</p>
                        <p className="text-sm leading-relaxed text-gray-300">
                            {body}
                        </p>
                    </div>
                </div>

                <div className="flex justify-end border-t border-gray-700 px-6 py-4">
                    <button
                        type="button"
                        onClick={dismissCodingOver}
                        className="cursor-pointer w-full py-3 rounded-xl font-bold text-sm text-gray-300 border border-gray-700 hover:border-gray-500 hover:text-gray-100 active:scale-95 transition-all duration-200"
                    >
                        Continue to Voting
                    </button>
                </div>

                <div className="h-1 w-full bg-gray-800">
                    <div className={`h-full ${bar}`} style={{ width: `${remaining * 100}%` }} />
                </div>
            </div>
        </div>
    );
}
