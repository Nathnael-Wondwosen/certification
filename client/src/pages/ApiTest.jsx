import React, { useState, useEffect } from 'react';

export default function ApiTest() {
  const [connectionStatus, setConnectionStatus] = useState('Testing...');
  const [apiResponse, setApiResponse] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function testApiConnection() {
      try {
        const response = await fetch('/api/public/health');
        const data = await response.json();
        
        if (response.ok) {
          setConnectionStatus('Connected');
          setApiResponse(data);
          setError(null);
        } else {
          setConnectionStatus('Error');
          setError(data.message || 'Unknown error');
        }
      } catch (err) {
        setConnectionStatus('Error');
        setError(err.message);
      }
    }

    testApiConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="w-full bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-center mb-4">API Connection Test</h2>
        
        <div className="text-center">
          <div className={`text-lg font-semibold mb-2 ${
            connectionStatus === 'Connected' ? 'text-green-600' : 
            connectionStatus === 'Error' ? 'text-red-600' : 'text-yellow-600'
          }`}>
            {connectionStatus}
          </div>
          
          {apiResponse && (
            <div className="mt-4 text-left bg-gray-100 p-4 rounded">
              <pre className="text-sm overflow-auto">
                {JSON.stringify(apiResponse, null, 2)}
              </pre>
            </div>
          )}
          
          {error && (
            <div className="mt-4 text-left bg-red-100 p-4 rounded">
              <div className="text-red-800 font-medium">Error:</div>
              <div className="text-red-600">{error}</div>
            </div>
          )}
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          This page tests the connection between the frontend and backend API.
        </div>
      </div>
    </div>
  );
}