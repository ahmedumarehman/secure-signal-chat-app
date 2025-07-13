// Simplified Signal Protocol implementation using Web Crypto API for compatibility
import { Buffer } from 'buffer';

export interface KeyPair {
    publicKey: Uint8Array;
    privateKey: Uint8Array;
}

export interface PublicKeyBundle {
    identityKey: string; // base64 encoded
    registrationId: number;
    preKeyId: number;
    preKey: string; // base64 encoded
    signedPreKeyId: number;
    signedPreKey: string; // base64 encoded
    signedPreKeySignature: string; // base64 encoded
}

export interface EncryptedMessage {
    ciphertext: string;
    type: 'prekey' | 'signal';
}

export class SignalProtocolService {
    private identityKeyPair: KeyPair | null = null;
    private registrationId: number = 0;
    private preKeys: Map<number, KeyPair> = new Map();
    private signedPreKey: { id: number; keyPair: KeyPair; signature: Uint8Array; timestamp: number } | null = null;
    private sessions: Map<string, { sendingChain: Uint8Array; receivingChain: Uint8Array; rootKey: Uint8Array }> = new Map();

    async generateKeyBundle(): Promise<void> {
        // Generate identity key pair
        this.identityKeyPair = await this.generateKeyPair();

        // Generate registration ID (random 14-bit number)
        this.registrationId = Math.floor(Math.random() * 16384);

        // Generate pre-keys (batch of one-time keys)
        for (let i = 1; i <= 10; i++) {
            this.preKeys.set(i, await this.generateKeyPair());
        }

        // Generate signed pre-key
        const signedPreKeyId = 1;
        const signedKeyPair = await this.generateKeyPair();
        const timestamp = Date.now();

        // Create signature using identity private key
        const signedPreKeySignature = await this.signData(signedKeyPair.publicKey, this.identityKeyPair.privateKey);

        this.signedPreKey = {
            id: signedPreKeyId,
            keyPair: signedKeyPair,
            signature: signedPreKeySignature,
            timestamp
        };
    }

    getPublicKeyBundle(): PublicKeyBundle | null {
        if (!this.identityKeyPair || !this.signedPreKey || this.preKeys.size === 0) {
            return null;
        }

        const firstPreKeyId = Array.from(this.preKeys.keys())[0];
        const firstPreKey = this.preKeys.get(firstPreKeyId)!;

        return {
            identityKey: Buffer.from(this.identityKeyPair.publicKey).toString('base64'),
            registrationId: this.registrationId,
            preKeyId: firstPreKeyId,
            preKey: Buffer.from(firstPreKey.publicKey).toString('base64'),
            signedPreKeyId: this.signedPreKey.id,
            signedPreKey: Buffer.from(this.signedPreKey.keyPair.publicKey).toString('base64'),
            signedPreKeySignature: Buffer.from(this.signedPreKey.signature).toString('base64')
        };
    }

    async createSession(recipientId: string, publicKeyBundle: PublicKeyBundle): Promise<void> {
        if (!this.identityKeyPair) {
            throw new Error('Key bundle not generated. Call generateKeyBundle() first.');
        }

        try {
            // Perform X3DH key agreement
            const identityKey = Buffer.from(publicKeyBundle.identityKey, 'base64');
            const preKey = Buffer.from(publicKeyBundle.preKey, 'base64');
            const signedPreKey = Buffer.from(publicKeyBundle.signedPreKey, 'base64');

            // Verify signed pre-key signature
            const signature = Buffer.from(publicKeyBundle.signedPreKeySignature, 'base64');
            if (!(await this.verifySignature(signedPreKey, signature, identityKey))) {
                throw new Error('Invalid signed pre-key signature');
            }

            // Generate ephemeral key for this session
            const ephemeralKey = await this.generateKeyPair();

            // Perform X3DH key agreement
            const sharedSecret = await this.performX3DH(
                this.identityKeyPair,
                ephemeralKey,
                identityKey,
                signedPreKey,
                preKey
            );

            // Initialize Double Ratchet
            const rootKey = await this.hkdf(sharedSecret, new Uint8Array(32), 'RootKey');
            const sendingChain = await this.hkdf(rootKey, new Uint8Array(0), 'SendingChain');
            const receivingChain = await this.hkdf(rootKey, new Uint8Array(0), 'ReceivingChain');

            this.sessions.set(recipientId, {
                sendingChain,
                receivingChain,
                rootKey
            });

        } catch (error) {
            console.error('Error creating session:', error);
            throw error;
        }
    }

    async encryptMessage(recipientId: string, message: string): Promise<string> {
        const session = this.sessions.get(recipientId);
        if (!session) {
            throw new Error(`No session found for recipient: ${recipientId}`);
        }

        try {
            const messageBuffer = Buffer.from(message, 'utf8');

            // Generate message key from sending chain
            const messageKey = await this.hkdf(session.sendingChain, new Uint8Array(0), 'MessageKey');

            // Encrypt message using AES-256-GCM (simplified with HMAC)
            const iv = this.randomBytes(16);
            const encryptionKey = messageKey.slice(0, 32);
            const macKey = messageKey.slice(32, 64);

            const ciphertext = await this.aesEncrypt(messageBuffer, encryptionKey, iv);
            const mac = await this.hmac(Buffer.concat([iv, ciphertext]), macKey);

            const encryptedMessage = Buffer.concat([iv, ciphertext, mac]);

            // Update sending chain
            session.sendingChain = await this.hkdf(session.sendingChain, new Uint8Array(1), 'ChainKey');

            return Buffer.from(encryptedMessage).toString('base64');
        } catch (error) {
            console.error('Error encrypting message:', error);
            throw error;
        }
    }

    async decryptMessage(senderId: string, encryptedMessage: string): Promise<string> {
        const session = this.sessions.get(senderId);
        if (!session) {
            throw new Error(`No session found for sender: ${senderId}`);
        }

        try {
            const messageBuffer = Buffer.from(encryptedMessage, 'base64');

            // Extract components
            const iv = messageBuffer.slice(0, 16);
            const ciphertext = messageBuffer.slice(16, -32);
            const receivedMac = messageBuffer.slice(-32);

            // Generate message key from receiving chain
            const messageKey = await this.hkdf(session.receivingChain, new Uint8Array(0), 'MessageKey');
            const encryptionKey = messageKey.slice(0, 32);
            const macKey = messageKey.slice(32, 64);

            // Verify MAC
            const computedMac = await this.hmac(Buffer.concat([iv, ciphertext]), macKey);
            if (!this.constantTimeEqual(receivedMac, computedMac)) {
                throw new Error('MAC verification failed');
            }

            // Decrypt message
            const decryptedBuffer = await this.aesDecrypt(ciphertext, encryptionKey, iv);

            // Update receiving chain
            session.receivingChain = await this.hkdf(session.receivingChain, new Uint8Array(1), 'ChainKey');

            return Buffer.from(decryptedBuffer).toString('utf8');
        } catch (error) {
            console.error('Error decrypting message:', error);
            throw error;
        }
    }

    // Utility methods using Web Crypto API
    private randomBytes(length: number): Uint8Array {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return array;
    }

    private async generateKeyPair(): Promise<KeyPair> {
        const privateKey = this.randomBytes(32);
        const publicKey = await this.getPublicKeyFromPrivate(privateKey);
        return { publicKey, privateKey };
    }

    private async getPublicKeyFromPrivate(privateKey: Uint8Array): Promise<Uint8Array> {
        // Simplified public key derivation using SHA-256
        const hashBuffer = await crypto.subtle.digest('SHA-256', privateKey);
        return new Uint8Array(hashBuffer);
    }

    private async signData(data: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
        // Simplified signing using HMAC-SHA256
        const key = await crypto.subtle.importKey(
            'raw',
            privateKey,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const signature = await crypto.subtle.sign('HMAC', key, data);
        return new Uint8Array(signature);
    }

    private async verifySignature(data: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): Promise<boolean> {
        // Simplified verification using HMAC-SHA256
        try {
            const expectedSignature = await this.signData(data, publicKey);
            return this.constantTimeEqual(signature, expectedSignature);
        } catch {
            return false;
        }
    }

    private async performX3DH(
        identityKey: KeyPair,
        ephemeralKey: KeyPair,
        recipientIdentityKey: Uint8Array,
        recipientSignedPreKey: Uint8Array,
        recipientPreKey: Uint8Array
    ): Promise<Uint8Array> {
        // Simplified X3DH using SHA-256 hashing
        const dh1 = await this.ecdh(identityKey.privateKey, recipientSignedPreKey);
        const dh2 = await this.ecdh(ephemeralKey.privateKey, recipientIdentityKey);
        const dh3 = await this.ecdh(ephemeralKey.privateKey, recipientSignedPreKey);
        const dh4 = await this.ecdh(ephemeralKey.privateKey, recipientPreKey);

        return await this.hkdf(Buffer.concat([dh1, dh2, dh3, dh4]), new Uint8Array(32), 'SharedSecret');
    }

    private async ecdh(privateKey: Uint8Array, publicKey: Uint8Array): Promise<Uint8Array> {
        // Simplified ECDH using SHA-256
        const combined = Buffer.concat([privateKey, publicKey]);
        const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
        return new Uint8Array(hashBuffer);
    }

    private async hkdf(input: Uint8Array, salt: Uint8Array, info: string): Promise<Uint8Array> {
        // Simplified HKDF using HMAC-SHA256
        const hmacKey = salt.length > 0 ? salt : new Uint8Array(32);

        // Extract step
        const key = await crypto.subtle.importKey(
            'raw',
            hmacKey,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const prk = await crypto.subtle.sign('HMAC', key, input);

        // Expand step
        const prkKey = await crypto.subtle.importKey(
            'raw',
            prk,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const infoBuffer = Buffer.from(info, 'utf8');
        const okm = await crypto.subtle.sign('HMAC', prkKey, Buffer.concat([infoBuffer, Buffer.from([1])]));

        return new Uint8Array(okm);
    }

    private async aesEncrypt(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> {
        // Simplified AES encryption using XOR with key stream
        const keyStream = await this.generateKeyStream(key, iv, data.length);
        const result = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            result[i] = data[i] ^ keyStream[i];
        }
        return result;
    }

    private async aesDecrypt(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Promise<Uint8Array> {
        // Simplified AES decryption (same as encryption with XOR)
        return await this.aesEncrypt(data, key, iv);
    }

    private async generateKeyStream(key: Uint8Array, iv: Uint8Array, length: number): Promise<Uint8Array> {
        // Simplified key stream generation using SHA-256
        const result = new Uint8Array(length);
        let seed = Buffer.concat([key, iv]);

        for (let i = 0; i < length; i += 32) {
            const hashBuffer = await crypto.subtle.digest('SHA-256', seed);
            const hash = new Uint8Array(hashBuffer);
            const copyLength = Math.min(32, length - i);
            result.set(hash.slice(0, copyLength), i);
            seed = Buffer.from(hash);
        }

        return result;
    }

    private async hmac(data: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
        const hmacKey = await crypto.subtle.importKey(
            'raw',
            key,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        const mac = await crypto.subtle.sign('HMAC', hmacKey, data);
        return new Uint8Array(mac);
    }

    private constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
        if (a.length !== b.length) return false;
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a[i] ^ b[i];
        }
        return result === 0;
    }

    // Utility method to save key bundle to localStorage
    saveToLocalStorage(userId: string): void {
        if (!this.identityKeyPair || !this.signedPreKey) return;

        const serializedBundle = {
            identityKey: {
                publicKey: Buffer.from(this.identityKeyPair.publicKey).toString('base64'),
                privateKey: Buffer.from(this.identityKeyPair.privateKey).toString('base64')
            },
            registrationId: this.registrationId,
            preKeys: Array.from(this.preKeys.entries()).map(([id, keyPair]) => ({
                id,
                publicKey: Buffer.from(keyPair.publicKey).toString('base64'),
                privateKey: Buffer.from(keyPair.privateKey).toString('base64')
            })),
            signedPreKey: {
                id: this.signedPreKey.id,
                timestamp: this.signedPreKey.timestamp,
                publicKey: Buffer.from(this.signedPreKey.keyPair.publicKey).toString('base64'),
                privateKey: Buffer.from(this.signedPreKey.keyPair.privateKey).toString('base64'),
                signature: Buffer.from(this.signedPreKey.signature).toString('base64')
            }
        };

        localStorage.setItem(`signal_keys_${userId}`, JSON.stringify(serializedBundle));
    }

    // Utility method to load key bundle from localStorage
    loadFromLocalStorage(userId: string): boolean {
        const stored = localStorage.getItem(`signal_keys_${userId}`);
        if (!stored) return false;

        try {
            const serializedBundle = JSON.parse(stored);

            // Reconstruct key bundle from stored data
            this.identityKeyPair = {
                publicKey: new Uint8Array(Buffer.from(serializedBundle.identityKey.publicKey, 'base64')),
                privateKey: new Uint8Array(Buffer.from(serializedBundle.identityKey.privateKey, 'base64'))
            };

            this.registrationId = serializedBundle.registrationId;

            this.preKeys.clear();
            serializedBundle.preKeys.forEach((pk: { id: number; publicKey: string; privateKey: string }) => {
                this.preKeys.set(pk.id, {
                    publicKey: new Uint8Array(Buffer.from(pk.publicKey, 'base64')),
                    privateKey: new Uint8Array(Buffer.from(pk.privateKey, 'base64'))
                });
            });

            this.signedPreKey = {
                id: serializedBundle.signedPreKey.id,
                timestamp: serializedBundle.signedPreKey.timestamp,
                keyPair: {
                    publicKey: new Uint8Array(Buffer.from(serializedBundle.signedPreKey.publicKey, 'base64')),
                    privateKey: new Uint8Array(Buffer.from(serializedBundle.signedPreKey.privateKey, 'base64'))
                },
                signature: new Uint8Array(Buffer.from(serializedBundle.signedPreKey.signature, 'base64'))
            };

            return true;
        } catch (error) {
            console.error('Error loading keys from localStorage:', error);
            return false;
        }
    }
}
