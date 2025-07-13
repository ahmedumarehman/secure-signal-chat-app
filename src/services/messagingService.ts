import { ref, push, onValue, query, orderByChild, limitToLast, set } from 'firebase/database';
import { database } from '../config/firebase';
import { SignalProtocolService } from './signalProtocol';
import { AuthService } from './authService';

export interface Message {
    id: string;
    senderId: string;
    receiverId: string;
    encryptedContent: string;
    timestamp: number;
    type: 'text' | 'file';
}

export interface DecryptedMessage extends Omit<Message, 'encryptedContent'> {
    content: string;
    senderName: string;
}

interface ConversationData {
    participants?: string[];
    lastMessage?: {
        content: string;
        timestamp: number;
        senderId: string;
    };
    updatedAt?: number;
}

export class MessagingService {
    private signalService: SignalProtocolService;
    private authService: AuthService;
    private messageListeners: Map<string, () => void> = new Map();

    constructor(signalService: SignalProtocolService, authService: AuthService) {
        this.signalService = signalService;
        this.authService = authService;
    }

    async sendMessage(receiverId: string, content: string, type: 'text' | 'file' = 'text'): Promise<void> {
        const currentUser = this.authService.getCurrentUser();
        if (!currentUser) {
            throw new Error('User not authenticated');
        }

        try {
            // Encrypt the message using Signal Protocol
            const encryptedContent = await this.signalService.encryptMessage(receiverId, content);

            // Create message object
            const message: Omit<Message, 'id'> = {
                senderId: currentUser.uid,
                receiverId,
                encryptedContent,
                timestamp: Date.now(),
                type
            };

            // Save to Firebase
            const conversationId = this.getConversationId(currentUser.uid, receiverId);
            const messagesRef = ref(database, `conversations/${conversationId}/messages`);
            await push(messagesRef, message);

            // Update conversation metadata
            await this.updateConversationMetadata(conversationId, currentUser.uid, receiverId, message.timestamp);

        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    async establishSession(recipientId: string): Promise<void> {
        try {
            // Get recipient's public key bundle
            const publicKeyBundle = await this.authService.getPublicKeys(recipientId);
            if (!publicKeyBundle) {
                throw new Error('Recipient public keys not found');
            }

            // Create Signal Protocol session
            await this.signalService.createSession(recipientId, publicKeyBundle);

            console.log(`Session established with ${recipientId}`);
        } catch (error) {
            console.error('Error establishing session:', error);
            throw error;
        }
    }

    listenToMessages(conversationId: string, callback: (messages: DecryptedMessage[]) => void): string {
        const listenerId = Math.random().toString(36).substring(7);

        const messagesRef = ref(database, `conversations/${conversationId}/messages`);
        const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(50));

        const unsubscribe = onValue(messagesQuery, async (snapshot) => {
            const messagesData = snapshot.val();
            if (!messagesData) {
                callback([]);
                return;
            }

            const messages: Message[] = Object.entries(messagesData).map(([id, data]) => ({
                id,
                ...(data as Omit<Message, 'id'>)
            }));

            // Decrypt messages
            const decryptedMessages: DecryptedMessage[] = [];
            for (const message of messages) {
                try {
                    let content: string;
                    let senderName: string;

                    // Decrypt message content
                    if (message.senderId === this.authService.getCurrentUser()?.uid) {
                        // Own message - might be stored encrypted, try to decrypt or use as-is
                        try {
                            content = await this.signalService.decryptMessage(message.receiverId, message.encryptedContent);
                        } catch {
                            // If decryption fails, it might be a legacy unencrypted message
                            content = message.encryptedContent;
                        }
                        senderName = 'You';
                    } else {
                        // Message from another user
                        content = await this.signalService.decryptMessage(message.senderId, message.encryptedContent);
                        senderName = `User-${message.senderId.slice(-6)}`;
                    }

                    decryptedMessages.push({
                        ...message,
                        content,
                        senderName
                    });
                } catch (error) {
                    console.error('Error decrypting message:', error);
                    // Add failed decryption placeholder
                    decryptedMessages.push({
                        ...message,
                        content: '[Failed to decrypt message]',
                        senderName: `User-${message.senderId.slice(-6)}`
                    });
                }
            }

            // Sort by timestamp
            decryptedMessages.sort((a, b) => a.timestamp - b.timestamp);
            callback(decryptedMessages);
        });

        this.messageListeners.set(listenerId, unsubscribe);
        return listenerId;
    }

    stopListeningToMessages(listenerId: string): void {
        const unsubscribe = this.messageListeners.get(listenerId);
        if (unsubscribe) {
            unsubscribe();
            this.messageListeners.delete(listenerId);
        }
    }

    async getConversations(): Promise<Array<{
        id: string;
        participantId: string;
        participantName: string;
        lastMessage?: {
            content: string;
            timestamp: number;
            senderId: string;
        };
    }>> {
        const currentUser = this.authService.getCurrentUser();
        if (!currentUser) return [];

        try {
            const conversationsRef = ref(database, 'conversations');

            return new Promise((resolve) => {
                onValue(conversationsRef, (snapshot) => {
                    const conversationsData = snapshot.val();
                    if (!conversationsData) {
                        resolve([]);
                        return;
                    }

                    const conversations = Object.entries(conversationsData)
                        .filter(([conversationId]) => conversationId.includes(currentUser.uid))
                        .map(([conversationId, data]) => {
                            const conversationData = data as ConversationData;
                            const participants = conversationId.split('_').sort();
                            const participantId = participants.find(id => id !== currentUser.uid) || '';

                            return {
                                id: conversationId,
                                participantId,
                                participantName: `User-${participantId.slice(-6)}`,
                                lastMessage: conversationData.lastMessage ? {
                                    content: conversationData.lastMessage.content,
                                    timestamp: conversationData.lastMessage.timestamp,
                                    senderId: conversationData.lastMessage.senderId
                                } : undefined
                            };
                        })
                        .sort((a, b) => {
                            const aTime = a.lastMessage?.timestamp || 0;
                            const bTime = b.lastMessage?.timestamp || 0;
                            return bTime - aTime;
                        });

                    resolve(conversations);
                }, { onlyOnce: true });
            });
        } catch (error) {
            console.error('Error getting conversations:', error);
            return [];
        }
    }

    getConversationId(userId1: string, userId2: string): string {
        // Create a consistent conversation ID by sorting user IDs
        return [userId1, userId2].sort().join('_');
    }

    private async updateConversationMetadata(
        conversationId: string,
        senderId: string,
        receiverId: string,
        timestamp: number
    ): Promise<void> {
        const conversationRef = ref(database, `conversations/${conversationId}`);
        const metadata = {
            participants: [senderId, receiverId],
            lastMessage: {
                senderId,
                timestamp,
                content: '[Encrypted Message]' // Don't store decrypted content in metadata
            },
            updatedAt: timestamp
        };

        await set(conversationRef, metadata);
    }
}

export default MessagingService;
