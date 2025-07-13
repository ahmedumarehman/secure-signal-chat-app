# SecureChat - End-to-End Encrypted Messaging App

A secure messaging application built with React, TypeScript, and Firebase, implementing the Signal Protocol for end-to-end encryption.

## Features

- 🔐 **End-to-End Encryption**: Messages are encrypted using Signal Protocol with X3DH key exchange and Double Ratchet
- 🔥 **Firebase Integration**: Real-time messaging using Firebase Realtime Database
- 👤 **Anonymous Authentication**: Users can join conversations without personal information
- 🌐 **Real-time Communication**: Live message delivery and online presence indicators
- 🎨 **Modern UI**: Beautiful, responsive interface built with TailwindCSS
- 🔒 **Security Features**: Perfect forward secrecy, message integrity, and replay protection

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: TailwindCSS
- **Backend**: Firebase (Auth, Realtime Database, Analytics)
- **Encryption**: Signal Protocol implementation with Web Crypto API
- **Build Tool**: Vite
- **Crypto Polyfills**: Browser-compatible crypto modules

## Prerequisites

- Node.js 18+ (recommended)
- npm or yarn
- Firebase project with Realtime Database enabled

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd new
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Firebase**:
   - The Firebase configuration is already set up in `src/config/firebase.ts`
   - Make sure your Firebase project has:
     - Authentication enabled (Anonymous provider)
     - Realtime Database enabled
     - Analytics (optional)

4. **Start the development server**:
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── components/          # React components
│   ├── Login.tsx       # Authentication component
│   ├── UserList.tsx    # Online users list
│   └── ChatWindow.tsx  # Main chat interface
├── services/           # Core services
│   ├── authService.ts  # Authentication & user management
│   ├── signalProtocol.ts # Signal Protocol implementation
│   └── messagingService.ts # Encrypted messaging
├── config/
│   └── firebase.ts     # Firebase configuration
└── App.tsx            # Main application component
```

## How It Works

### Signal Protocol Implementation

1. **Key Generation**: Each user generates:
   - Identity key pair (long-term)
   - Signed pre-key pair (medium-term)
   - One-time pre-keys (short-term)

2. **X3DH Key Exchange**: Establishes initial shared secret
   - Uses recipient's identity key, signed pre-key, and one-time pre-key
   - Performs triple Diffie-Hellman exchange

3. **Double Ratchet**: Provides forward secrecy
   - Derives message keys from chain keys
   - Updates keys after each message
   - Ensures old messages can't be decrypted if keys are compromised

### Security Features

- **Perfect Forward Secrecy**: Old messages remain secure even if long-term keys are compromised
- **Post-Compromise Security**: Communication security is restored after key compromise
- **Message Integrity**: All messages are authenticated
- **Replay Protection**: Messages can't be replayed by attackers

## Usage

1. **Login**: Click "Connect Securely" to authenticate anonymously and generate encryption keys
2. **Select User**: Choose an online user from the sidebar to start a conversation
3. **Send Messages**: Type and send encrypted messages in real-time
4. **Security Indicators**: Green indicators show when encryption is established

## Firebase Configuration

The app is configured to use:
- **Database URL**: `https://emrchains-56fb0-default-rtdb.firebaseio.com/`
- **Project ID**: `emrchains-56fb0`
- **Authentication**: Anonymous provider
- **Storage**: User keys and encrypted messages

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Key Files to Understand

1. **signalProtocol.ts**: Core encryption implementation
2. **authService.ts**: User authentication and key distribution
3. **messagingService.ts**: Message sending/receiving with encryption
4. **App.tsx**: Main application state and component orchestration

## Security Considerations

- Keys are stored in localStorage (consider more secure storage for production)
- Uses Web Crypto API for cryptographic operations
- All communication is encrypted before leaving the client
- Firebase only stores encrypted messages and public keys

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Deploy the `dist/` folder to your hosting service

3. Ensure Firebase rules allow read/write access for authenticated users

## Contributing

This project implements a simplified version of the Signal Protocol for educational purposes. For production use, consider using the official Signal libraries.

## License

This project is for educational and internship purposes.
