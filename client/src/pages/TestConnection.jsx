import React, { useState, useEffect } from 'react';
import { testApiConnection, testAuthenticatedApiConnection } from '../utils/apiTest';

export default function TestConnection() {
  const [status, setStatus] = useState('Checking...');
  const [details, setDetails] = useState(null);
  const [authStatus, setAuthStatus] = useState('Checking...');
  const [authDetails, setAuthDetails] = useState(null);

  useEffect(() => {
    async function testConnection() {
      // Test public API endpoint
      const publicResult = await testApiConnection();
      
      if (publicResult.success) {
        setStatus('Success');
        setDetails(publicResult.data);
      } else {
        setStatus('Error');
        setDetails({ message: publicResult.error });
      }
      
      // Test authenticated API endpoint if we have a token
      const token = localStorage.getItem('token');
      if (token) {
        const authResult = await testAuthenticatedApiConnection(token);
        
        if (authResult.success) {
          setAuthStatus('Success');
          setAuthDetails(authResult.data);
        } else {
          setAuthStatus('Error');
          setAuthDetails({ message: authResult.error });
        }
      } else {
        setAuthStatus('Skipped');
        setAuthDetails({ message: 'No authentication token found' });
      }
    }

    testConnection();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
      <div className="max-w-md w-full bg-white shadow rounded-lg p-6 space-y-6">
        <h2 className="text-2xl font-bold text-center mb-4">Frontend-Backend Connection Test</h2>
        
        <div className="border-b pb-4">
          <h3 className="text-lg font-semibold mb-2">Public API Connection</h3>
          <div className="text-center">
            <div className={`text-lg font-semibold mb-2 ${
              status === 'Success' ? 'text-green-600' : 
              status === 'Error' ? 'text-red-600' : 'text-yellow-600'
            }`}>
              {status}
            </div>
            
            {details && (
              <div className="mt-4 text-left bg-gray-100 p-4 rounded">
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2">Authenticated API Connection</h3>
          <div className="text-center">
            <div className={`text-lg font-semibold mb-2 ${
              authStatus === 'Success' ? 'text-green-600' : 
              authStatus === 'Error' ? 'text-red-600' : 
              authStatus === 'Skipped' ? 'text-yellow-600' : 'text-yellow-600'
            }`}>
              {authStatus}
            </div>
            
            {authDetails && (
              <div className="mt-4 text-left bg-gray-100 p-4 rounded">
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(authDetails, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-center text-sm text-gray-500">
          This page tests the connection between the frontend and backend.
        </div>
      </div>
    </div>
  );
}