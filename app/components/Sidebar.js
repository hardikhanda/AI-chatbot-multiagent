// components/Sidebar.jsx
export default function Sidebar({ onNewChat }) {
    return (
        <div className="w-64 bg-gray-50 shadow-md h-screen flex flex-col">
            <div className="p-4">
                <button
                    onClick={onNewChat}
                    className="w-full flex items-center justify-center gap-2 px-2 py-2 rounded-md bg-black hover:bg-gray-800 text-white transition-colors"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                        />
                    </svg>
                    New Chat
                </button>
            </div>
        </div>
    );
}