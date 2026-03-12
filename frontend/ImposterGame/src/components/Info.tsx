import { X } from "lucide-react";

type JoinFormProps = {
    onInfoExitClick: () => void;
};

export default function JoinForm({ onInfoExitClick }: JoinFormProps) {
    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center">
                <div className="relative border border-gray-700 bg-brand-gray w-100 h-100 rounded-lg">
                    <h1 className="text-xl text-white font-bold p-4">Info</h1>
                    <button
                        type="button"
                        className="absolute top-2 right-2 text-white cursor-pointer"
                        onClick={onInfoExitClick}
                    >
                        <X />
                    </button>
                </div>
            </div>
        </>
    );
}