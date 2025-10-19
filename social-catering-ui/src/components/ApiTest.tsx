import React, { useEffect, useState } from 'react';

const ApiTest: React.FC = () => {
  const [skills, setSkills] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testApi = async () => {
      try {
        setLoading(true);
        
        // Test Skills API
        const skillsResponse = await fetch('http://localhost:3000/api/v1/skills');
        if (!skillsResponse.ok) {
          throw new Error(`Skills API failed: ${skillsResponse.status}`);
        }
        const skillsData = await skillsResponse.json();
        setSkills(skillsData.data || []);

        // Test Locations API
        const locationsResponse = await fetch('http://localhost:3000/api/v1/locations');
        if (!locationsResponse.ok) {
          throw new Error(`Locations API failed: ${locationsResponse.status}`);
        }
        const locationsData = await locationsResponse.json();
        setLocations(locationsData.data || []);

        setError(null);
      } catch (err: any) {
        console.error('API Test Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    testApi();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2">Testing API connection...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-semibold text-red-800 mb-2">API Test Failed</h2>
        <p className="text-red-700">Error: {error}</p>
        <p className="text-red-600 text-sm mt-2">Make sure the backend is running on port 3000</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
      <h2 className="text-xl font-semibold text-green-800 mb-4">✅ API Test Successful!</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-semibold text-green-700 mb-2">Skills ({skills.length})</h3>
          <ul className="text-sm text-green-600 space-y-1">
            {skills.slice(0, 5).map(skill => (
              <li key={skill.id}>• {skill.name}</li>
            ))}
            {skills.length > 5 && <li>... and {skills.length - 5} more</li>}
          </ul>
        </div>
        
        <div>
          <h3 className="font-semibold text-green-700 mb-2">Locations ({locations.length})</h3>
          <ul className="text-sm text-green-600 space-y-1">
            {locations.slice(0, 5).map(location => (
              <li key={location.id}>• {location.display_name}</li>
            ))}
            {locations.length > 5 && <li>... and {locations.length - 5} more</li>}
          </ul>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-blue-700 text-sm">
          🎉 CORS is working! The frontend can now successfully fetch data from the backend API.
        </p>
      </div>
    </div>
  );
};

export default ApiTest;
