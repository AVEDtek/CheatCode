import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
    X,
    ChevronLeft,
    ChevronRight,
    Gamepad2,
    Users,
    Code,
    Vote,
    Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type InfoProps = {
    onInfoExitClick: () => void;
};

type Slide = {
    icon: LucideIcon;
    label: string;
    title: string;
    body: ReactNode;
};

const slides: Slide[] = [
    {
        icon: Gamepad2,
        label: "Overview",
        title: "What is CheatCode?",
        body: (
            <div className="space-y-4">
                <p>
                    CheatCode turns LeetCode practice into a social deduction party game. Everyone in the
                    room <span className="text-gray-200">appears</span> to solve the same problem together —
                    but one player is secretly the imposter who never sees the real prompt.
                </p>
                <p>
                    Trade clues, write code, and bluff your way through. The crew hunts the imposter; the
                    imposter tries to blend in.
                </p>
                <div className="rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4">
                    <p className="text-xs uppercase tracking-widest font-semibold text-gray-500">Round Flow</p>
                    <p className="mt-2 text-gray-300">Briefing → Coding → Voting → Results</p>
                </div>
            </div>
        ),
    },
    {
        icon: Users,
        label: "Briefing",
        title: "Briefing",
        body: (
            <div className="space-y-4">
                <p>
                    Roles are assigned secretly. The <span className="text-gray-200">crew</span> sees the full
                    problem — title, difficulty, description, examples, and constraints.
                </p>
                <p>
                    The <span className="text-red-300">imposter</span> only sees a few topic hints, never the
                    actual prompt. They'll have to fake it.
                </p>
                <div className="rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4">
                    <p className="text-xs uppercase tracking-widest font-semibold text-gray-500">Get Ready</p>
                    <p className="mt-2 text-gray-300">
                        Hit <span className="text-gray-200">Ready</span> when you've read your briefing — once
                        everyone's ready (or the timer runs out), coding begins.
                    </p>
                </div>
            </div>
        ),
    },
    {
        icon: Code,
        label: "Coding",
        title: "Coding",
        body: (
            <div className="space-y-4">
                <p>
                    Everyone shares <span className="text-gray-200">one editor</span>. Turns rotate on a
                    timer, and the active player's keystrokes stream live to the whole room.
                </p>
                <p>
                    Talk it out while you code — the crew shares clues, and the imposter improvises to stay
                    under the radar.
                </p>
                <div className="rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4">
                    <p className="text-xs uppercase tracking-widest font-semibold text-gray-500">Early Exit</p>
                    <p className="mt-2 text-gray-300">
                        Pass <span className="text-gray-200">all</span> the tests and the round ends early —
                        straight to voting.
                    </p>
                </div>
            </div>
        ),
    },
    {
        icon: Vote,
        label: "Voting",
        title: "Voting",
        body: (
            <div className="space-y-4">
                <p>
                    Time to point fingers. Each player votes for who they think the imposter is.
                </p>
                <div className="rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4">
                    <p className="text-xs uppercase tracking-widest font-semibold text-gray-500">Closing The Vote</p>
                    <p className="mt-2 text-gray-300">
                        Voting closes once everyone has voted or the timer expires. If there's a tie, every
                        most-voted player counts.
                    </p>
                </div>
            </div>
        ),
    },
    {
        icon: Trophy,
        label: "Results",
        title: "Results",
        body: (
            <div className="space-y-4">
                <p>
                    The imposter is revealed, along with whoever got voted out.
                </p>
                <div className="rounded-xl border border-gray-700 bg-brand-gray-light/40 p-4 space-y-2">
                    <p className="text-xs uppercase tracking-widest font-semibold text-gray-500">Win Conditions</p>
                    <p className="text-gray-300">Crew wins by correctly identifying the imposter.</p>
                    <p className="text-gray-300">Imposter wins by surviving the vote.</p>
                </div>
                <p>
                    Then hit <span className="text-gray-200">Play Again</span> for a rematch, or head back to
                    the main menu.
                </p>
            </div>
        ),
    },
];

export default function Info({ onInfoExitClick }: InfoProps) {
    const [index, setIndex] = useState<number>(0);

    const isFirst = index === 0;
    const isLast = index === slides.length - 1;

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "ArrowLeft") {
                setIndex((prev) => Math.max(0, prev - 1));
            } else if (event.key === "ArrowRight") {
                setIndex((prev) => Math.min(slides.length - 1, prev + 1));
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const slide = slides[index];
    const Icon = slide.icon;

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

                    <div className="px-6 py-5 text-sm text-gray-400 leading-relaxed">
                        <div className="min-h-[280px] space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-600/15 text-purple-400">
                                    <Icon size={20} />
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-widest font-semibold text-gray-500">
                                        {slide.label}
                                    </p>
                                    <h2 className="text-lg font-bold text-gray-100">{slide.title}</h2>
                                </div>
                            </div>
                            {slide.body}
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
                        <button
                            type="button"
                            onClick={() => setIndex((prev) => Math.max(0, prev - 1))}
                            disabled={isFirst}
                            aria-label="Previous slide"
                            className={`rounded-xl p-2 transition-all duration-200 ${isFirst
                                ? "text-gray-700 cursor-default"
                                : "text-gray-400 hover:text-gray-100 hover:bg-gray-800 cursor-pointer"
                                }`}
                        >
                            <ChevronLeft size={18} />
                        </button>

                        <div className="flex items-center gap-2">
                            {slides.map((s, i) => (
                                <button
                                    key={s.label}
                                    type="button"
                                    onClick={() => setIndex(i)}
                                    aria-label={`Go to ${s.label} slide`}
                                    className={`rounded-full transition-all duration-200 cursor-pointer ${i === index
                                        ? "w-5 h-2 bg-purple-500"
                                        : "w-2 h-2 bg-gray-600 hover:bg-gray-500"
                                        }`}
                                />
                            ))}
                        </div>

                        {isLast ? (
                            <button
                                type="button"
                                onClick={onInfoExitClick}
                                className="cursor-pointer rounded-xl bg-purple-700 px-4 py-2 text-sm font-bold text-white transition-all duration-200 hover:bg-purple-600 active:scale-95"
                            >
                                Got it
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setIndex((prev) => Math.min(slides.length - 1, prev + 1))}
                                aria-label="Next slide"
                                className="rounded-xl p-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-all duration-200 cursor-pointer"
                            >
                                <ChevronRight size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
