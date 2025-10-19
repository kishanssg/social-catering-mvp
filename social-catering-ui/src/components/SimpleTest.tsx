import React from 'react';

const SimpleTest: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-blue-600">Simple Test Component</h1>
      
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h2 className="text-green-800 font-semibold">✅ React is working!</h2>
        <p className="text-green-700 mt-2">If you can see this, the basic React app is functioning correctly.</p>
      </div>
      
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Test Steps:</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>This component loaded successfully</li>
          <li>Tailwind CSS is working (colored boxes above)</li>
          <li>TypeScript compilation is working</li>
          <li>Vite hot reload is working</li>
        </ol>
      </div>
    </div>
  );
};

export default SimpleTest;
