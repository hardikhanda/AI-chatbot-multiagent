// components/EditableTitle.jsx
"use client"
import { useState, useRef, useEffect } from 'react';

export default function EditableTitle({ title, onUpdate, isActive }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editableTitle, setEditableTitle] = useState(title);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus();
        }
    }, [isEditing]);

    const handleSubmit = () => {
        if (editableTitle.trim()) {
            onUpdate(editableTitle.trim());
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
        if (e.key === 'Escape') {
            setEditableTitle(title);
            setIsEditing(false);
        }
    };

    return (
        <div className={`p-3 cursor-pointer hover:bg-gray-300 ${isActive ? 'bg-gray-300' : ''
            }`}>
            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={editableTitle}
                    onChange={(e) => setEditableTitle(e.target.value)}
                    onBlur={handleSubmit}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-gray-400 text-black px-2 py-1 rounded"
                />
            ) : (
                <div
                    onClick={() => setIsEditing(true)}
                    className="text-black text-sm truncate"
                >
                    {title}
                </div>
            )}
        </div>
    );
}