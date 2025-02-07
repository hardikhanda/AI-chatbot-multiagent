'use client';

import { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';

const PROVIDERS = {
    openai: {
        name: 'OpenAI (GPT-4)',
        models: ['gpt-4o-mini', 'gpt-3.5-turbo'],
    },
    anthropic: {
        name: 'Anthropic (Claude)',
        models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229'],
    },
    google: {
        name: 'Google (Gemini)',
        models: ['gemini-pro'],
    },
};

export default function Chat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [provider, setProvider] = useState('openai');
    const [model, setModel] = useState(PROVIDERS.openai.models[0]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const [chatSessions, setChatSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleProviderChange = (e) => {
        const newProvider = e.target.value;
        setProvider(newProvider);
        setModel(PROVIDERS[newProvider].models[0]);
    };

    const handleGeminiResponse = async (response) => {
        try {
            const data = await response.json();
            const newMessage = {
                role: 'assistant',
                content: data.response
            };
            setMessages(prev => [...prev, newMessage]);

            // Update chat session
            setChatSessions(prev => prev.map(session =>
                session.id === currentSessionId
                    ? { ...session, messages: [...session.messages, newMessage] }
                    : session
            ));
        } catch (error) {
            console.error('Error parsing Gemini response:', error);
            throw error;
        }
    };

    const handleAnthropicResponse = async (response) => {
        try {
            const data = await response.json();
            const newMessage = {
                role: 'assistant',
                content: data.response
            };
            setMessages(prev => [...prev, newMessage]);

            // Update chat session
            setChatSessions(prev => prev.map(session =>
                session.id === currentSessionId
                    ? { ...session, messages: [...session.messages, newMessage] }
                    : session
            ));
        } catch (error) {
            console.error('Error parsing Anthropic response:', error);
            throw error;
        }
    };

    const handleStreamingResponse = async (response) => {
        try {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedResponse = '';

            setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                accumulatedResponse += chunk;

                setMessages(prevMessages => {
                    const newMessages = [...prevMessages];
                    newMessages[newMessages.length - 1] = {
                        role: 'assistant',
                        content: accumulatedResponse,
                    };
                    return newMessages;
                });
            }

            // Update chat session after streaming is complete
            setChatSessions(prev => prev.map(session =>
                session.id === currentSessionId
                    ? {
                        ...session,
                        messages: [...session.messages, {
                            role: 'assistant',
                            content: accumulatedResponse
                        }]
                    }
                    : session
            ));

        } catch (error) {
            console.error('Error handling streaming response:', error);
            throw error;
        }
    };

    const sendMessage = async (e) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        setIsLoading(true);
        const userMessage = input.trim();
        setInput('');

        try {
            const newMessages = [...messages, { role: 'user', content: userMessage }];
            setMessages(newMessages);

            // Update current session
            // Generate title if this is the first message
            if (messages.length === 0) {
                const title = await generateTitle(userMessage);
                setChatSessions(prev => prev.map(session =>
                    session.id === currentSessionId
                        ? { ...session, title, messages: newMessages }
                        : session
                ));
            } else {
                setChatSessions(prev => prev.map(session =>
                    session.id === currentSessionId
                        ? { ...session, messages: newMessages }
                        : session
                ));
            }

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    })),
                    provider,
                    model,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            // Handle response based on provider
            switch (provider) {
                case 'google':
                    await handleGeminiResponse(response);
                    break;
                case 'anthropic':
                    await handleAnthropicResponse(response);
                    break;
                default:
                    await handleStreamingResponse(response);
            }

            // Don't update sessions here - it's handled in the response handlers

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, there was an error processing your request.',
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const generateTitle = async (message) => {
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{
                        role: 'user',
                        content: `Generate a very short title (max 4 words) for a conversation that starts with this message: "${message}" only give 4 words or less no other text like here is the response`
                    }],
                    provider: 'anthropic',
                    model: 'claude-3-sonnet-20240229',
                }),
            });

            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('Error generating title:', error);
            return 'New Chat';
        }
    };

    const createNewChat = () => {
        const newSession = {
            id: Date.now(),
            title: 'New Chat',
            messages: [],
            provider,
            model,
            timestamp: new Date()
        };

        setChatSessions(prevSessions => {
            // Check if this session already exists
            const sessionExists = prevSessions.some(session => session.id === newSession.id);
            if (sessionExists) {
                return prevSessions;
            }
            return [newSession, ...prevSessions];
        });

        setCurrentSessionId(newSession.id);
        setMessages([]);
        setInput('');
    };


    const handleNewChat = () => {
        createNewChat();
    };

    const handleSelectSession = (sessionId) => {
        const session = chatSessions.find(s => s.id === sessionId);
        if (session) {
            setCurrentSessionId(sessionId);
            // Ensure messages is an array and contains valid message objects
            setMessages(session.messages || []);
            setProvider(session.provider || 'openai');
            setModel(session.model || PROVIDERS.openai.models[0]);
        }
    };

    const handleUpdateTitle = (sessionId, newTitle) => {
        setChatSessions(prev => prev.map(session =>
            session.id === sessionId
                ? { ...session, title: newTitle }
                : session
        ));
    };

    //accessing local storage
    useEffect(() => {
        const savedSessions = localStorage.getItem('chatSessions');
        if (savedSessions) {
            try {
                const sessions = JSON.parse(savedSessions);
                if (sessions.length > 0) {
                    setChatSessions(sessions);
                    setCurrentSessionId(sessions[0].id);
                    setMessages(sessions[0].messages || []);
                    setProvider(sessions[0].provider || 'openai');
                    setModel(sessions[0].model || PROVIDERS.openai.models[0]);
                } else {
                    createNewChat(); // Create new chat if saved sessions array is empty
                }
            } catch (error) {
                console.error('Error parsing saved sessions:', error);
                createNewChat(); // Create new chat if there's an error
            }
        } else {
            createNewChat(); // Create new chat if no saved sessions
        }
    }, []); // Empty dependency array - runs only once on mount

    // Add this useEffect to save sessions
    useEffect(() => {
        if (chatSessions.length > 0) {
            localStorage.setItem('chatSessions', JSON.stringify(chatSessions));
        }
    }, [chatSessions]);



    return (
        <div className="flex h-screen w-full">
            {/* Sidebar - hide on mobile, show on md and up */}
            <div className="hidden md:block">
                <Sidebar
                    onNewChat={handleNewChat}
                    chatSessions={chatSessions}
                    currentSessionId={currentSessionId}
                    onSelectSession={handleSelectSession}
                    onUpdateTitle={handleUpdateTitle}
                />
            </div>

            <div className="flex-1 flex flex-col w-full">
                {/* Header */}
                <div className="flex items-center justify-between px-2 sm:px-4 py-3 border-b bg-white">
                    <h2 className="text-lg sm:text-xl font-semibold">Chatbot</h2>
                    <div className="flex gap-1 sm:gap-2">
                        <select
                            value={provider}
                            onChange={handleProviderChange}
                            className="px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm border rounded-md bg-black hover:bg-gray-800 text-white"
                            disabled={isLoading}
                        >
                            {Object.entries(PROVIDERS).map(([key, { name }]) => (
                                <option key={key} value={key}>
                                    {name}
                                </option>
                            ))}
                        </select>
                        <select
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm border rounded-md bg-black hover:bg-gray-800 text-white"
                            disabled={isLoading}
                        >
                            {PROVIDERS[provider].models.map((modelOption) => (
                                <option key={modelOption} value={modelOption}>
                                    {modelOption}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto bg-white">
                    <div className="w-full max-w-3xl mx-auto px-2 sm:px-4 my-4 sm:my-10">
                        {messages && messages.length > 0 ? (
                            messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`py-8 ${index !== messages.length - 1 ? 'border-b' : ''
                                        }`}
                                >
                                    <div className="flex items-start space-x-3">
                                        <div
                                            className={`w-7 h-7 rounded-full flex items-center justify-center ${msg?.role === 'user' ? 'bg-black' : 'bg-green-500'
                                                }`}
                                        >
                                            {msg?.role === 'user' ? (
                                                <span className="text-white text-sm">U</span>
                                            ) : (
                                                <span className="text-white text-sm">A</span>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <p className="font-medium">
                                                {msg?.role === 'user' ? 'You' : 'Assistant'}
                                            </p>
                                            <div className="prose prose-sm max-w-none">
                                                <p className="whitespace-pre-wrap">
                                                    {msg?.content || ''}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                <div className="text-center mt-20">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-10 w-10 mx-auto mb-2"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                                    </svg>
                                    <p>Start a new conversation</p>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Form */}
                <div className="border-t bg-white">
                    <div className="max-w-3xl mx-auto px-2 sm:px-4 py-2 sm:py-4">
                        <form onSubmit={sendMessage} className="flex space-x-2 sm:space-x-4">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className="flex-1 min-w-0 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                placeholder="Send a message..."
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                className={`h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-full text-white ${isLoading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-black hover:bg-gray-800'
                                    }`}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <div className="flex items-center space-x-2">
                                        <span className="animate-pulse">...</span>
                                    </div>
                                ) : (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth="2"
                                        stroke="currentColor"
                                        className="w-4 h-4 sm:w-5 sm:h-5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75"
                                        />
                                    </svg>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}