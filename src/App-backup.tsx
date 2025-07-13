import { useState } from 'react';
import { AuthService } from './services/authService';
import { MessagingService } from './services/messagingService';
import { SignalProtocolService } from './services/signalProtocol';
import { testFirebaseConnection } from './services/firebaseTest';
import UserList from './components/UserList';
import ChatWindow from './components/ChatWindow';
import type { UserProfile } from './services/authService';
import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [authService, setAuthService] = useState<AuthService | null>(null);
  const [messagingService, setMessagingService] = useState<MessagingService | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSecureChat = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔍 Testing Firebase connection...');
      await testFirebaseConnection();

      console.log('🔐 Starting authentication...');
      const auth = new AuthService();
      const userProfile = await auth.signInAnonymously();

      console.log('✅ Authentication successful!', userProfile);

      console.log('🔑 Initializing messaging service...');
      const signalService = new SignalProtocolService();
      await signalService.generateKeyBundle();
      const messaging = new MessagingService(signalService, auth);
      console.log('✅ Messaging service initialized');

      // Set all state
      setCurrentUser(userProfile.uid);
      setAuthService(auth);
      setMessagingService(messaging);

      console.log('🎉 Setup complete! Ready for secure messaging.');
    } catch (err: unknown) {
      console.error('❌ Authentication failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start secure chat';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (currentUser && authService && messagingService) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        fontFamily: 'Arial, sans-serif'
      }}>
        {/* User List Sidebar */}
        <UserList
          authService={authService}
          onUserSelect={setSelectedUser}
          selectedUserId={selectedUser?.uid}
        />

        {/* Chat Area */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {selectedUser ? (
            <ChatWindow
              selectedUser={selectedUser}
              messagingService={messagingService}
              authService={authService}
            />
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f9fafb',
              color: '#6b7280'
            }}>
              <div style={{
                fontSize: '4rem',
                marginBottom: '20px'
              }}>💬</div>
              <h2 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: '500',
                marginBottom: '10px'
              }}>
                Welcome to Secure Chat
              </h2>
              <p style={{
                margin: 0,
                fontSize: '1rem',
                textAlign: 'center'
              }}>
                Select a user from the sidebar to start an encrypted conversation
              </p>
              <div style={{
                marginTop: '30px',
                fontSize: '0.9rem',
                color: '#9ca3af',
                textAlign: 'center'
              }}>
                <p>🔐 End-to-end encrypted with Signal Protocol</p>
                <p>🚀 Real-time messaging with Firebase</p>
                <p>🔥 Built with React + TypeScript</p>
              </div>
              <button
                onClick={() => {
                  setCurrentUser(null);
                  setAuthService(null);
                  setMessagingService(null);
                  setSelectedUser(null);
                }}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  marginTop: '30px'
                }}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

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
        maxWidth: '500px',
        width: '90%'
      }}>
        <h1 style={{
          color: '#333',
          marginBottom: '20px',
          fontSize: '2.5rem'
        }}>
          🔐 SecureChat
        </h1>
        <p style={{
          color: '#666',
          marginBottom: '30px',
          fontSize: '1.1rem'
        }}>
          End-to-end encrypted messaging with Signal Protocol
        </p>

        <button
          onClick={handleSecureChat}
          disabled={isLoading}
          style={{
            background: isLoading ? '#9ca3af' : '#4f46e5',
            color: 'white',
            border: 'none',
            padding: '15px 30px',
            borderRadius: '8px',
            fontSize: '1.1rem',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            minWidth: '200px'
          }}
        >
          {isLoading ? (
            <>
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid #ffffff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginRight: '10px'
              }}></div>
              Connecting...
            </>
          ) : (
            'Start Secure Chat'
          )}
        </button>

        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '15px',
            borderRadius: '8px',
            marginTop: '20px',
            fontSize: '0.9rem'
          }}>
            <strong>Error:</strong> {error}
            <br />
            <span style={{ fontSize: '0.8rem', color: '#991b1b' }}>
              Check browser console (F12) for more details.
            </span>
          </div>
        )}

        <div style={{
          marginTop: '30px',
          fontSize: '0.9rem',
          color: '#888'
        }}>
          <p>✅ React + TypeScript</p>
          <p>✅ Firebase Integration</p>
          <p>✅ Signal Protocol Encryption</p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default App;
