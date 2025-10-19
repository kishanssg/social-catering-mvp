import React, { useState, useEffect } from 'react';
import { apiClient } from '../lib/api';

export function TestWorkersData() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function testWorkersAPI() {
      try {
        console.log('Testing workers API...');
        
        // First try to login
        console.log('Attempting to login...');
        const loginResponse = await apiClient.post('/login', {
          user: { email: 'test@example.com', password: 'password' }
        });
        console.log('Login response:', loginResponse.data);
        
        // Then try to get workers
        console.log('Getting workers...');
        const response = await apiClient.get('/workers');
        console.log('Raw response:', response);
        console.log('Response data:', response.data);
        console.log('Response status:', response.status);
        setData(response.data);
      } catch (err) {
        console.error('Error testing workers API:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    testWorkersAPI();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Workers API Test</h1>
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Raw Response:</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
      
      {data?.data?.workers && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Workers Count: {data.data.workers.length}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.data.workers.slice(0, 6).map((worker: any) => (
              <div key={worker.id} className="bg-white p-4 rounded border">
                <h3 className="font-semibold">{worker.first_name} {worker.last_name}</h3>
                <p className="text-sm text-gray-600">{worker.email}</p>
                <p className="text-sm text-gray-600">{worker.phone}</p>
                <p className="text-sm">
                  Status: {worker.active ? 'Active' : 'Inactive'}
                </p>
                <p className="text-sm">
                  Skills: {worker.skills_json?.join(', ') || 'None'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
