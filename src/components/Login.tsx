import React, { useState } from 'react';
import { AuthService } from '../services/authService';
import { testFirebaseConnection } from '../services/firebaseTest';

interface LoginProps {
    onLogin: (userId: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showTroubleshooting, setShowTroubleshooting] = useState(false);

    const handleSecureChat = async () => {
        setIsLoading(true);
        setError(null);

        try {
            console.log('🔍 Starting Firebase connection test...');
            await testFirebaseConnection();

            console.log('🔐 Attempting anonymous authentication...');
            const authService = new AuthService();
            const userProfile = await authService.signInAnonymously();
            console.log('✅ Authentication successful, user profile:', userProfile);
            onLogin(userProfile.uid);
        } catch (err: unknown) {
            console.error('❌ Authentication failed:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to start secure chat';
            setError(errorMessage);
            setShowTroubleshooting(true);
        } finally {
            setIsLoading(false);
        }
    };

    const renderTroubleshooting = () => (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-800 mb-3">Troubleshooting Firebase Connection</h3>

            {error?.includes('auth/configuration-not-found') && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                    <h4 className="font-semibold text-red-800">Configuration Error Detected</h4>
                    <p className="text-red-700 mt-1">Firebase Authentication is not properly configured.</p>
                </div>
            )}

            <div className="space-y-3 text-sm text-yellow-700">
                <div>
                    <strong>Step 1:</strong> Go to{' '}
                    <a
                        href="https://console.firebase.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                    >
                        Firebase Console
                    </a>
                </div>

                <div>
                    <strong>Step 2:</strong> Select your project: <code className="bg-gray-200 px-1 rounded">emrchains-56fb0</code>
                </div>

                <div>
                    <strong>Step 3:</strong> Navigate to <strong>Authentication</strong> → <strong>Sign-in method</strong>
                </div>

                <div>
                    <strong>Step 4:</strong> Enable <strong>Anonymous</strong> authentication provider
                </div>

                <div>
                    <strong>Step 5:</strong> Ensure <strong>Realtime Database</strong> is created with appropriate rules
                </div>

                <div className="mt-4 p-2 bg-blue-50 border border-blue-200 rounded">
                    <strong>Current Error:</strong> <code className="text-red-600">{error}</code>
                </div>
            </div>

            <button
                onClick={() => setShowTroubleshooting(false)}
                className="mt-3 text-sm text-blue-600 hover:text-blue-800"
            >
                Hide Troubleshooting
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Secure Messaging
                    </h1>
                    <p className="text-gray-600">
                        End-to-end encrypted chat with Signal Protocol
                    </p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={handleSecureChat}
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center"
                    >
                        {isLoading ? (
                            <div className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Connecting...
                            </div>
                        ) : (
                            'Start Secure Chat'
                        )}
                    </button>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex">
                                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-red-800">Connection Failed</p>
                                    <p className="text-sm text-red-700 mt-1">{error}</p>
                                    {!showTroubleshooting && (
                                        <button
                                            onClick={() => setShowTroubleshooting(true)}
                                            className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
                                        >
                                            Show Troubleshooting Guide
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {showTroubleshooting && renderTroubleshooting()}

                    <div className="text-center text-sm text-gray-500">
                        <p>🔒 Your messages are protected with Signal Protocol encryption</p>
                        <p className="mt-1">🔥 Powered by Firebase Realtime Database</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
