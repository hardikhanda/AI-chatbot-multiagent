import EditableTitle from "./EditableTitle";

// components/Sidebar.jsx
export default function Sidebar({
    onNewChat,
    chatSessions,
    currentSessionId,
    onSelectSession,
    onUpdateTitle
}) {
    return (
        <div className="w-64 bg-gray-50 h-screen flex flex-col">
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

            <div className="flex-1 gap-1 overflow-y-auto">
                {chatSessions.map(session => (
                    <div
                        key={session.id}
                        onClick={() => onSelectSession(session.id)}
                        className={`p-3 cursor-pointer hover:bg-gray-200 ${currentSessionId === session.id ? 'bg-gray-200' : ''
                            }`}
                    >
                        <EditableTitle
                            title={session.title}
                            isActive={currentSessionId === session.id}
                            onUpdate={(newTitle) => onUpdateTitle(session.id, newTitle)}
                        />
                        <div className="text-gray-700 text-xs">
                            {new Date(session.timestamp).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}                  
