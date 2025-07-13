import { useState, useEffect } from 'react';
import { signInAnonymously, signOut } from 'firebase/auth';
import { ref, set, onValue, push, serverTimestamp, onDisconnect } from 'firebase/database';
import { auth, database } from './config/firebase';
import './App.css';

interface User {
    uid: string;
    name: string;
    isOnline: boolean;
    lastSeen: number;
}

interface Message {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: number;
}

function App() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Login function
    const handleLogin = async () => {
        setIsLoading(true);
        try {
            const result = await signInAnonymously(auth);
            const uid = result.user.uid;
            const userName = `User-${uid.slice(-6)}`;

            const user: User = {
                uid,
                name: userName,
                isOnline: true,
                lastSeen: Date.now()
            };

            // Save user to database
            await set(ref(database, `users/${uid}`), user);

            // Set up presence (go offline when disconnected)
            const presenceRef = ref(database, `users/${uid}`);
            onDisconnect(presenceRef).update({
                isOnline: false,
                lastSeen: serverTimestamp()
            });

            setCurrentUser(user);
            console.log('✅ Logged in as:', userName);
        } catch (error) {
            console.error('❌ Login failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Logout function
    const handleLogout = async () => {
        if (currentUser) {
            await set(ref(database, `users/${currentUser.uid}`), {
                ...currentUser,
                isOnline: false,
                lastSeen: Date.now()
            });
            await signOut(auth);
            setCurrentUser(null);
            setUsers([]);
            setSelectedUserId(null);
            setMessages([]);
        }
    };

    // Listen for users
    useEffect(() => {
        if (!currentUser) return;

        const usersRef = ref(database, 'users');
        const unsubscribe = onValue(usersRef, (snapshot) => {
            const usersData = snapshot.val();
            if (usersData) {
                const usersList = Object.values(usersData) as User[];
                const otherUsers = usersList.filter(user =>
                    user.uid !== currentUser.uid && user.isOnline
                );
                setUsers(otherUsers);
                console.log('👥 Online users:', otherUsers.length);
            }
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Listen for messages
    useEffect(() => {
        if (!selectedUserId || !currentUser) return;

        const chatId = [currentUser.uid, selectedUserId].sort().join('_');
        const messagesRef = ref(database, `chats/${chatId}/messages`);

        const unsubscribe = onValue(messagesRef, (snapshot) => {
            const messagesData = snapshot.val();
            if (messagesData) {
                const messagesList = Object.entries(messagesData).map(([id, data]) => ({
                    id,
                    ...(data as Omit<Message, 'id'>)
                })) as Message[];
                messagesList.sort((a, b) => a.timestamp - b.timestamp);
                setMessages(messagesList);
            } else {
                setMessages([]);
            }
        });

        return () => unsubscribe();
    }, [selectedUserId, currentUser]);

    // Send message
    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedUserId || !currentUser) return;

        const chatId = [currentUser.uid, selectedUserId].sort().join('_');
        const messagesRef = ref(database, `chats/${chatId}/messages`);

        const message = {
            senderId: currentUser.uid,
            senderName: currentUser.name,
            content: newMessage.trim(),
            timestamp: Date.now()
        };

        await push(messagesRef, message);
        setNewMessage('');
    };

    // Format time
    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Login screen
    if (!currentUser) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Arial, sans-serif'
            }}>
                <div style={{
                    background: 'white',
                    padding: '40px',
                    borderRadius: '15px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    textAlign: 'center',
                    maxWidth: '400px',
                    width: '90%'
                }}>
                    <h1 style={{ color: '#667eea', marginBottom: '20px' }}>🔐 Secure Chat</h1>
                    <p style={{ color: '#666', marginBottom: '30px' }}>
                        Join the encrypted chat room
                    </p>
                    <button
                        onClick={handleLogin}
                        disabled={isLoading}
                        style={{
                            background: isLoading ? '#ccc' : '#667eea',
                            color: 'white',
                            border: 'none',
                            padding: '15px 30px',
                            borderRadius: '8px',
                            fontSize: '1rem',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            width: '100%'
                        }}
                    >
                        {isLoading ? 'Joining...' : 'Join Chat'}
                    </button>
                </div>
            </div>
        );
    }

    const selectedUser = users.find(u => u.uid === selectedUserId);

    // Main chat interface
    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            fontFamily: 'Arial, sans-serif'
        }}>
            {/* Sidebar */}
            <div style={{
                width: '300px',
                background: '#f8f9fa',
                borderRight: '1px solid #dee2e6',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid #dee2e6',
                    background: 'white'
                }}>
                    <h2 style={{ margin: 0, color: '#333', fontSize: '1.2rem' }}>
                        🔐 Secure Chat
                    </h2>
                    <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '0.9rem' }}>
                        {currentUser.name}
                    </p>
                </div>

                {/* Users list */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '10px 0'
                }}>
                    <div style={{
                        padding: '10px 20px',
                        fontSize: '0.9rem',
                        fontWeight: 'bold',
                        color: '#666'
                    }}>
                        Online Users ({users.length})
                    </div>

                    {users.length === 0 ? (
                        <div style={{
                            padding: '20px',
                            textAlign: 'center',
                            color: '#999'
                        }}>
                            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>👥</div>
                            <p>No other users online</p>
                            <p style={{ fontSize: '0.8rem' }}>
                                Open another browser tab to test!
                            </p>
                        </div>
                    ) : (
                        users.map(user => (
                            <div
                                key={user.uid}
                                onClick={() => setSelectedUserId(user.uid)}
                                style={{
                                    padding: '15px 20px',
                                    cursor: 'pointer',
                                    background: selectedUserId === user.uid ? '#e3f2fd' : 'transparent',
                                    borderLeft: selectedUserId === user.uid ? '4px solid #2196f3' : '4px solid transparent'
                                }}
                                onMouseEnter={(e) => {
                                    if (selectedUserId !== user.uid) {
                                        e.currentTarget.style.background = '#f5f5f5';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (selectedUserId !== user.uid) {
                                        e.currentTarget.style.background = 'transparent';
                                    }
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: '#4CAF50',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        marginRight: '12px',
                                        position: 'relative'
                                    }}>
                                        {user.name.slice(-2).toUpperCase()}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '0',
                                            right: '0',
                                            width: '12px',
                                            height: '12px',
                                            background: '#4CAF50',
                                            borderRadius: '50%',
                                            border: '2px solid white'
                                        }}></div>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '500', color: '#333' }}>
                                            {user.name}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#4CAF50' }}>
                                            Online
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Logout button */}
                <div style={{
                    padding: '15px 20px',
                    borderTop: '1px solid #dee2e6'
                }}>
                    <button
                        onClick={handleLogout}
                        style={{
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Chat area */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column'
            }}>
                {selectedUser ? (
                    <>
                        {/* Chat header */}
                        <div style={{
                            padding: '20px',
                            borderBottom: '1px solid #dee2e6',
                            background: 'white'
                        }}>
                            <h3 style={{ margin: 0, color: '#333' }}>
                                💬 Chat with {selectedUser.name}
                            </h3>
                            <p style={{ margin: '5px 0 0 0', color: '#4CAF50', fontSize: '0.9rem' }}>
                                🟢 Online
                            </p>
                        </div>

                        {/* Messages */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '20px',
                            background: '#f8f9fa'
                        }}>
                            {messages.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    color: '#999',
                                    padding: '50px 20px'
                                }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '10px' }}>💬</div>
                                    <p>No messages yet. Start the conversation!</p>
                                </div>
                            ) : (
                                messages.map(message => (
                                    <div
                                        key={message.id}
                                        style={{
                                            marginBottom: '15px',
                                            display: 'flex',
                                            justifyContent: message.senderId === currentUser.uid ? 'flex-end' : 'flex-start'
                                        }}
                                    >
                                        <div style={{
                                            maxWidth: '70%',
                                            padding: '12px 16px',
                                            borderRadius: '18px',
                                            background: message.senderId === currentUser.uid ? '#2196f3' : 'white',
                                            color: message.senderId === currentUser.uid ? 'white' : '#333',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                        }}>
                                            <div style={{ fontWeight: '500', fontSize: '0.8rem', marginBottom: '4px' }}>
                                                {message.senderName}
                                            </div>
                                            <div>{message.content}</div>
                                            <div style={{
                                                fontSize: '0.7rem',
                                                opacity: 0.7,
                                                marginTop: '4px'
                                            }}>
                                                {formatTime(message.timestamp)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Message input */}
                        <div style={{
                            padding: '20px',
                            borderTop: '1px solid #dee2e6',
                            background: 'white'
                        }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Type your message..."
                                    style={{
                                        flex: 1,
                                        padding: '12px 16px',
                                        border: '1px solid #dee2e6',
                                        borderRadius: '25px',
                                        outline: 'none',
                                        fontSize: '1rem'
                                    }}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim()}
                                    style={{
                                        background: newMessage.trim() ? '#2196f3' : '#ccc',
                                        color: 'white',
                                        border: 'none',
                                        padding: '12px 24px',
                                        borderRadius: '25px',
                                        cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                                        fontSize: '1rem'
                                    }}
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f8f9fa',
                        color: '#666'
                    }}>
                        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>💬</div>
                        <h2 style={{ margin: 0, fontWeight: '500' }}>Welcome to Secure Chat</h2>
                        <p style={{ margin: '10px 0 0 0', textAlign: 'center' }}>
                            Select a user from the sidebar to start chatting
                        </p>
                        <div style={{
                            marginTop: '30px',
                            textAlign: 'center',
                            fontSize: '0.9rem',
                            color: '#999'
                        }}>
                            <p>🔐 Real-time messaging</p>
                            <p>🔥 Built with React + Firebase</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
