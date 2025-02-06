'use client';

import { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';

const PROVIDERS = {
    openai: {
        name: 'OpenAI (GPT-4)',
        models: ['gpt-3.5-turbo', 'gpt-4o-mini'],
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
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.response
            }]);
        } catch (error) {
            console.error('Error parsing Gemini response:', error);
            throw error;
        }
    };

    const handleAnthropicResponse = async (response) => {
        try {
            const data = await response.json();
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.response
            }]);
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
            const newMessages = [
                ...messages,
                { role: 'user', content: userMessage }
            ];

            setMessages(newMessages);

            const messageHistory = newMessages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messageHistory,
                    provider,
                    model,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || response.statusText);
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
        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, there was an error processing your request. Please try again.',
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewChat = () => {
        setMessages([]);
        setInput('');
    };

    return (
        <div className="flex h-screen w-full">
            <Sidebar onNewChat={handleNewChat} />
            <div className="flex-1 flex flex-col w-full">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
                    <h2 className="text-xl font-semibold">AI Chatbot</h2>
                    <div className="flex gap-2">
                        <select
                            value={provider}
                            onChange={handleProviderChange}
                            className="px-3 py-3 text-sm border rounded-md bg-black hover:bg-gray-800 text-white"
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
                            className="px-3 py-3 text-sm border rounded-md bg-black hover:bg-gray-800 text-white"
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
                    <div className="max-w-3xl mx-auto px-4">
                        {messages.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-400">
                                <div className="text-center">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-8 w-8 mx-auto mb-2"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                        />
                                    </svg>
                                    <p>Start a new conversation</p>
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`py-8 ${index !== messages.length - 1 ? 'border-b' : ''
                                        }`}
                                >
                                    <div className="flex items-start space-x-3">
                                        <div
                                            className={`w-7 h-7 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-black' : 'bg-green-500'
                                                }`}
                                        >
                                            {msg.role === 'user' ? (
                                                <span className="text-white text-sm">U</span>
                                            ) : (
                                                <span className="text-white text-sm">A</span>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <p className="font-medium">
                                                {msg.role === 'user' ? 'You' : 'Assistant'}
                                            </p>
                                            <div className="prose prose-sm max-w-none">
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Input Form */}
                <div className="border-t bg-white">
                    <div className="max-w-3xl mx-auto px-4 py-4">
                        <form onSubmit={sendMessage} className="flex space-x-4">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                className="flex-1 min-w-0 px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                placeholder="Send a message..."
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                className={`h-12 w-12 flex items-center justify-center rounded-full text-white ${isLoading
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
                                        className="w-5 h-5"
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