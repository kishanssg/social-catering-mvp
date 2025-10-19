import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { getShifts } from '../services/shiftsApi';
import { getAssignments } from '../services/assignmentsApi';
import { apiClient } from '../lib/api';

export function DebugApi() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const testApiCalls = async () => {
    setLoading(true);
    const testResults: any = {};

    try {
      // Test workers API
      console.log('Testing workers API...');
      console.log('API Base URL:', import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1');
      const workersResponse = await apiService.getWorkers({});
      console.log('Workers response:', workersResponse);
      testResults.workers = {
        success: true,
        data: workersResponse,
        error: null
      };
    } catch (err: any) {
      console.error('Workers API error:', err);
      console.error('Error details:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        config: err.config
      });
      testResults.workers = {
        success: false,
        data: null,
        error: err.message || err.toString()
      };
    }

    try {
      // Test shifts API (using same method as Dashboard)
      console.log('Testing shifts API...');
      const shiftsResponse = await getShifts();
      console.log('Shifts response:', shiftsResponse);
      testResults.shifts = {
        success: true,
        data: shiftsResponse,
        error: null
      };
    } catch (err: any) {
      console.error('Shifts API error:', err);
      testResults.shifts = {
        success: false,
        data: null,
        error: err.message || err.toString()
      };
    }

    try {
      // Test assignments API (using same method as Dashboard)
      console.log('Testing assignments API...');
      const assignmentsResponse = await getAssignments();
      console.log('Assignments response:', assignmentsResponse);
      testResults.assignments = {
        success: true,
        data: assignmentsResponse,
        error: null
      };
    } catch (err: any) {
      console.error('Assignments API error:', err);
      testResults.assignments = {
        success: false,
        data: null,
        error: err.message || err.toString()
      };
    }

    // Test raw apiClient
    try {
      console.log('Testing raw apiClient...');
      const rawResponse = await apiClient.get('/workers');
      console.log('Raw apiClient response:', rawResponse);
      testResults.rawApiClient = {
        success: true,
        data: rawResponse.data,
        error: null
      };
    } catch (err: any) {
      console.error('Raw apiClient error:', err);
      testResults.rawApiClient = {
        success: false,
        data: null,
        error: err.message || err.toString()
      };
    }

    setResults(testResults);
    setLoading(false);
  };

  useEffect(() => {
    // Add a delay to simulate the Dashboard loading
    const timer = setTimeout(() => {
      testApiCalls();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-4">API Debug Results</h3>
      <button 
        onClick={testApiCalls}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test API Calls'}
      </button>
      
      <div className="space-y-4">
        {Object.entries(results).map(([key, result]: [string, any]) => (
          <div key={key} className="p-3 border rounded">
            <h4 className="font-semibold">{key.toUpperCase()}</h4>
            <div className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
              Status: {result.success ? 'SUCCESS' : 'ERROR'}
            </div>
            {result.error && (
              <div className="text-red-600 text-sm mt-1">
                Error: {result.error}
              </div>
            )}
            {result.data && (
              <div className="text-sm mt-1">
                <pre className="bg-gray-200 p-2 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
