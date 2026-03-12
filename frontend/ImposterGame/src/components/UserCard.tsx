import { User } from "lucide-react";

type UserCardProps = {
    username: string;
    highlighted: boolean
}

export default function UserCard({ username, highlighted }: UserCardProps) {
    return (
        <>
            <div className={`flex text-white mr-5 mb-3 p-3 rounded-r-xl ${highlighted ? "bg-purple-700" : "bg-brand-gray-light"}`}>
                <User className="mr-3" />
                {username}
            </div>
        </>
    );
}