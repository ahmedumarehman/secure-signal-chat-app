function App() {
    return (
        <div style={{
            padding: '50px',
            textAlign: 'center',
            fontSize: '24px',
            backgroundColor: '#f0f8ff',
            minHeight: '100vh'
        }}>
            <h1 style={{ color: '#2563eb', marginBottom: '20px' }}>
                🔐 SecureChat Test
            </h1>
            <p style={{ color: '#374151', marginBottom: '30px' }}>
                If you can see this, React is working!
            </p>
            <button
                style={{
                    padding: '12px 24px',
                    backgroundColor: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '16px',
                    cursor: 'pointer'
                }}
                onClick={() => alert('Button clicked! App is working.')}
            >
                Test Button
            </button>
        </div>
    );
}

export default App;
