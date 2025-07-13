import {
    signInAnonymously,
    type User,
    onAuthStateChanged,
    signOut as firebaseSignOut
} from 'firebase/auth';
import { ref, set, get, onValue } from 'firebase/database';
import { auth, database } from '../config/firebase';
import type { PublicKeyBundle } from './signalProtocol';

export interface UserProfile {
    uid: string;
    displayName: string;
    isOnline: boolean;
    lastSeen: number;
    publicKeyBundle?: PublicKeyBundle;
}

export class AuthService {
    private currentUser: User | null = null;
    private userProfile: UserProfile | null = null;
    private onlineUsersListeners: Map<string, (users: UserProfile[]) => void> = new Map();

    constructor() {
        // Listen for auth state changes
        onAuthStateChanged(auth, (user) => {
            this.currentUser = user;
            if (user) {
                this.setUserOnline(user.uid);
                this.loadUserProfile(user.uid);
            }
        });
    }

    async signInAnonymously(): Promise<UserProfile> {
        try {
            // Force a fresh authentication by signing out first
            // This ensures each tab gets a unique user
            if (auth.currentUser) {
                console.log('Signing out existing user to create fresh session...');
                await firebaseSignOut(auth);
            }

            console.log('Starting anonymous sign in...');
            console.log('Auth object:', auth);
            console.log('Firebase config check:', {
                projectId: auth.app.options.projectId,
                authDomain: auth.app.options.authDomain
            });

            const result = await signInAnonymously(auth);
            const user = result.user;
            console.log('Anonymous sign in successful:', user);

            // Generate a display name with timestamp for uniqueness
            const timestamp = Date.now().toString().slice(-4);
            const displayName = `User-${user.uid.slice(-4)}-${timestamp}`;

            // Create user profile
            const userProfile: UserProfile = {
                uid: user.uid,
                displayName,
                isOnline: true,
                lastSeen: Date.now()
            };

            // Save user profile to Firebase
            await this.saveUserProfile(userProfile);

            this.userProfile = userProfile;
            return userProfile;
        } catch (error) {
            console.error('Error signing in anonymously:', error);
            throw error;
        }
    }

    async signOut(): Promise<void> {
        if (this.currentUser) {
            await this.setUserOffline(this.currentUser.uid);
            await firebaseSignOut(auth);
            this.currentUser = null;
            this.userProfile = null;
        }
    }

    getCurrentUser(): User | null {
        return this.currentUser;
    }

    getUserProfile(): UserProfile | null {
        return this.userProfile;
    }

    async updatePublicKeys(publicKeyBundle: PublicKeyBundle): Promise<void> {
        if (!this.currentUser || !this.userProfile) {
            throw new Error('User not authenticated');
        }

        const updatedProfile = {
            ...this.userProfile,
            publicKeyBundle
        };

        await this.saveUserProfile(updatedProfile);
        this.userProfile = updatedProfile;
    }

    async getPublicKeys(userId: string): Promise<PublicKeyBundle | null> {
        try {
            const userRef = ref(database, `users/${userId}`);
            const snapshot = await get(userRef);
            const userData = snapshot.val() as UserProfile;
            return userData?.publicKeyBundle || null;
        } catch (error) {
            console.error('Error getting public keys:', error);
            return null;
        }
    }

    async getOnlineUsers(): Promise<UserProfile[]> {
        try {
            // Clean up old offline users first
            await this.cleanupOfflineUsers();

            const usersRef = ref(database, 'users');
            const snapshot = await get(usersRef);
            const usersData = snapshot.val();

            if (!usersData) return [];

            const users: UserProfile[] = Object.values(usersData);
            return users.filter(user =>
                user &&
                user.uid &&
                user.isOnline &&
                user.uid !== this.currentUser?.uid
            ).map(user => ({
                ...user,
                displayName: user.displayName || `User-${user.uid.slice(-6)}`,
                lastSeen: user.lastSeen || Date.now()
            }));
        } catch (error) {
            console.error('Error getting online users:', error);
            return [];
        }
    }

    listenToOnlineUsers(callback: (users: UserProfile[]) => void): string {
        const listenerId = Math.random().toString(36).substring(7);
        this.onlineUsersListeners.set(listenerId, callback);

        // Clean up old users periodically
        this.cleanupOfflineUsers();

        const usersRef = ref(database, 'users');
        const unsubscribe = onValue(usersRef, (snapshot) => {
            const usersData = snapshot.val();
            if (!usersData) {
                callback([]);
                return;
            }

            const users: UserProfile[] = Object.values(usersData);
            const onlineUsers = users.filter(user =>
                user &&
                user.uid &&
                user.isOnline &&
                user.uid !== this.currentUser?.uid
            ).map(user => ({
                ...user,
                displayName: user.displayName || `User-${user.uid.slice(-6)}`,
                lastSeen: user.lastSeen || Date.now()
            }));

            callback(onlineUsers);
        });

        // Store unsubscribe function for cleanup
        this.onlineUsersListeners.set(listenerId, unsubscribe as unknown as (users: UserProfile[]) => void);

        return listenerId;
    }

    stopListeningToOnlineUsers(listenerId: string): void {
        const listener = this.onlineUsersListeners.get(listenerId);
        if (listener && typeof listener === 'function') {
            // This is actually the unsubscribe function
            (listener as unknown as () => void)();
        }
        this.onlineUsersListeners.delete(listenerId);
    }

    private async saveUserProfile(profile: UserProfile): Promise<void> {
        const userRef = ref(database, `users/${profile.uid}`);
        await set(userRef, profile);
    }

    private async loadUserProfile(uid: string): Promise<void> {
        try {
            const userRef = ref(database, `users/${uid}`);
            const snapshot = await get(userRef);
            const userData = snapshot.val() as UserProfile;

            if (userData) {
                this.userProfile = userData;
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    }

    private async setUserOnline(uid: string): Promise<void> {
        const userRef = ref(database, `users/${uid}`);
        const updates = {
            isOnline: true,
            lastSeen: Date.now()
        };

        // Update online status
        await set(userRef, {
            ...this.userProfile,
            ...updates
        });

        // Set up presence system using Firebase's disconnect functionality
        const connectedRef = ref(database, '.info/connected');
        onValue(connectedRef, (snapshot) => {
            if (snapshot.val() === true) {
                // We're connected (or reconnected), update status to online
                const presenceRef = ref(database, `users/${uid}`);
                set(presenceRef, {
                    ...this.userProfile,
                    isOnline: true,
                    lastSeen: Date.now()
                });

                // When we disconnect, update to offline
                // Note: Firebase has onDisconnect() but we'll use visibility API for better cross-tab support
            }
        });

        // Handle tab visibility changes for better presence
        if (typeof document !== 'undefined') {
            const handleVisibilityChange = () => {
                if (document.hidden) {
                    // Tab is hidden, but don't immediately go offline
                    // in case user is just switching tabs
                } else {
                    // Tab is visible, ensure we're online
                    set(userRef, {
                        ...this.userProfile,
                        isOnline: true,
                        lastSeen: Date.now()
                    });
                }
            };

            document.addEventListener('visibilitychange', handleVisibilityChange);

            // Set offline when page unloads
            window.addEventListener('beforeunload', () => {
                set(userRef, {
                    ...this.userProfile,
                    isOnline: false,
                    lastSeen: Date.now()
                });
            });
        }
    }

    private async setUserOffline(uid: string): Promise<void> {
        if (!this.userProfile) return;

        const userRef = ref(database, `users/${uid}`);
        await set(userRef, {
            ...this.userProfile,
            isOnline: false,
            lastSeen: Date.now()
        });
    }

    // Clean up users that have been offline for more than 5 minutes
    private async cleanupOfflineUsers(): Promise<void> {
        try {
            const usersRef = ref(database, 'users');
            const snapshot = await get(usersRef);
            const usersData = snapshot.val();

            if (!usersData) return;

            const now = Date.now();
            const fiveMinutesAgo = now - (5 * 60 * 1000); // 5 minutes

            Object.entries(usersData).forEach(async ([uid, userData]) => {
                const user = userData as UserProfile;
                if (!user.isOnline && user.lastSeen < fiveMinutesAgo) {
                    // Remove users offline for more than 5 minutes
                    const userRef = ref(database, `users/${uid}`);
                    await set(userRef, null);
                    console.log(`Cleaned up offline user: ${user.displayName}`);
                }
            });
        } catch (error) {
            console.error('Error cleaning up offline users:', error);
        }
    }
}
