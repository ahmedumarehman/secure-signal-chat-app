import React, { useState, useEffect } from 'react';
import type { UserProfile } from '../services/authService';
import { AuthService } from '../services/authService';

interface UserListProps {
    authService: AuthService;
    onUserSelect: (user: UserProfile) => void;
    selectedUserId?: string;
}

const UserList: React.FC<UserListProps> = ({ authService, onUserSelect, selectedUserId }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const listenerId = authService.listenToOnlineUsers((onlineUsers) => {
            setUsers(onlineUsers);
            setIsLoading(false);
        });

        return () => {
            authService.stopListeningToOnlineUsers(listenerId);
        };
    }, [authService]);

    const formatLastSeen = (lastSeen: number | undefined) => {
        if (!lastSeen) return 'Unknown';

        const now = Date.now();
        const diff = now - lastSeen;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return `${Math.floor(diff / 86400000)}d ago`;
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Online Users</h2>
                <p className="text-sm text-gray-500">{users.length} users online</p>
            </div>

            <div className="divide-y divide-gray-200">
                {users.length === 0 ? (
                    <div className="p-6 text-center">
                        <div className="text-gray-400 mb-2">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.121M17 20H7m10 0v-2c0-5.523-4.477-10-10-10s-10 4.477-10 10v2m10 0H7m0 0v-2a9 9 0 119 9v2M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <p className="text-gray-500">No other users online</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Share this app with others to start chatting!
                        </p>
                    </div>
                ) : (
                    users.map((user) => (
                        <div
                            key={user.uid}
                            onClick={() => onUserSelect(user)}
                            className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedUserId === user.uid ? 'bg-indigo-50 border-r-4 border-indigo-500' : ''
                                }`}
                        >
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
                                        <span className="text-white font-medium text-sm">
                                            {(user.displayName || 'User').slice(-2).toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <div className="ml-3 flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-gray-900">
                                            {user.displayName || `User-${user.uid.slice(-6)}`}
                                        </p>
                                        <div className="flex items-center">
                                            <div className={`h-2 w-2 rounded-full ${user.isOnline ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-gray-500">
                                            {user.isOnline ? 'Online' : formatLastSeen(user.lastSeen)}
                                        </p>
                                        {user.publicKeyBundle && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                🔐 Verified
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default UserList;
