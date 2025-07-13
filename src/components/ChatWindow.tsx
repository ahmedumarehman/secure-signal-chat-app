import React, { useState, useEffect, useRef } from 'react';
import type { UserProfile } from '../services/authService';
import type { DecryptedMessage } from '../services/messagingService';
import { MessagingService } from '../services/messagingService';
import { AuthService } from '../services/authService';

interface ChatWindowProps {
    selectedUser: UserProfile;
    messagingService: MessagingService;
    authService: AuthService;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ selectedUser, messagingService, authService }) => {
    const [messages, setMessages] = useState<DecryptedMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [sessionEstablished, setSessionEstablished] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const listenerRef = useRef<string | null>(null);

    const currentUser = authService.getCurrentUser();
    const conversationId = currentUser ? messagingService.getConversationId(currentUser.uid, selectedUser.uid) : '';

    useEffect(() => {
        if (!conversationId) return;

        // Establish session first
        const establishSession = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Check if session already exists or establish new one
                await messagingService.establishSession(selectedUser.uid);
                setSessionEstablished(true);

                // Start listening to messages
                const listenerId = messagingService.listenToMessages(conversationId, (newMessages) => {
                    setMessages(newMessages);
                    setIsLoading(false);
                });

                listenerRef.current = listenerId;
            } catch (err) {
                console.error('Error establishing session:', err);
                setError('Failed to establish secure connection');
                setIsLoading(false);
            }
        };

        establishSession();

        return () => {
            if (listenerRef.current) {
                messagingService.stopListeningToMessages(listenerRef.current);
            }
        };
    }, [conversationId, selectedUser.uid, messagingService]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newMessage.trim() || !sessionEstablished || isSending) return;

        setIsSending(true);
        setError(null);

        try {
            await messagingService.sendMessage(selectedUser.uid, newMessage.trim());
            setNewMessage('');
        } catch (err) {
            console.error('Error sending message:', err);
            setError('Failed to send message');
        } finally {
            setIsSending(false);
        }
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString();
        }
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Establishing secure connection...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                                {selectedUser.displayName.slice(-2).toUpperCase()}
                            </span>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-lg font-medium text-gray-900">{selectedUser.displayName}</h3>
                            <div className="flex items-center">
                                <div className={`h-2 w-2 rounded-full ${selectedUser.isOnline ? 'bg-green-400' : 'bg-gray-400'} mr-2`}></div>
                                <p className="text-sm text-gray-500">
                                    {selectedUser.isOnline ? 'Online' : 'Offline'}
                                </p>
                                {sessionEstablished && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        🔐 Encrypted
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                    <div className="flex">
                        <div className="ml-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-gray-400 mb-2">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.955 8.955 0 01-2.657-.398L5.5 21.5v-4.518C4.077 15.834 3 13.668 3 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                            </svg>
                        </div>
                        <p className="text-gray-500">No messages yet</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Send a message to start your encrypted conversation
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.reduce((acc: (DecryptedMessage | { type: 'date'; date: string })[], message, index) => {
                            const currentDate = formatDate(message.timestamp);
                            const prevMessage = messages[index - 1];
                            const prevDate = prevMessage ? formatDate(prevMessage.timestamp) : null;

                            if (currentDate !== prevDate) {
                                acc.push({ type: 'date', date: currentDate });
                            }
                            acc.push(message);
                            return acc;
                        }, []).map((item, index) => {
                            if ('type' in item && item.type === 'date') {
                                return (
                                    <div key={`date-${index}`} className="text-center">
                                        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                            {item.date}
                                        </span>
                                    </div>
                                );
                            }

                            const message = item as DecryptedMessage;
                            const isOwnMessage = message.senderId === currentUser?.uid;

                            return (
                                <div
                                    key={message.id}
                                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isOwnMessage
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-200 text-gray-900'
                                            }`}
                                    >
                                        <p className="text-sm">{message.content}</p>
                                        <p className={`text-xs mt-1 ${isOwnMessage ? 'text-indigo-200' : 'text-gray-500'
                                            }`}>
                                            {formatTime(message.timestamp)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-200 px-6 py-4">
                <form onSubmit={handleSendMessage} className="flex space-x-3">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={sessionEstablished ? "Type your encrypted message..." : "Establishing connection..."}
                        disabled={!sessionEstablished || isSending}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || !sessionEstablished || isSending}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatWindow;
