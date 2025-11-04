/**
 * Smoke Test for Critical Endpoints
 * 
 * Tests a minimal set of critical API endpoints to ensure deployment was successful.
 */

import axios from 'axios';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

interface TestResult {
  endpoint: string;
  status: 'pass' | 'fail';
  statusCode?: number;
  error?: string;
}

const criticalEndpoints = [
  { method: 'GET', path: '/healthz', name: 'Health check' },
  { method: 'GET', path: '/api/v1/skills', name: 'List skills' },
  { method: 'GET', path: '/api/v1/locations', name: 'List locations' },
  { method: 'GET', path: '/api/v1/events?tab=active', name: 'List active events' },
];

async function testEndpoint(endpoint: { method: string; path: string; name: string }): Promise<TestResult> {
  try {
    const url = `${API_BASE}${endpoint.path}`;
    const response = await axios.get(url, {
      validateStatus: () => true, // Don't throw on non-2xx
      timeout: 5000,
    });
    
    if (response.status >= 200 && response.status < 300) {
      return {
        endpoint: endpoint.name,
        status: 'pass',
        statusCode: response.status,
      };
    } else {
      return {
        endpoint: endpoint.name,
        status: 'fail',
        statusCode: response.status,
        error: `Returned ${response.status}`,
      };
    }
  } catch (error: any) {
    return {
      endpoint: endpoint.name,
      status: 'fail',
      error: error.message || 'Unknown error',
    };
  }
}

async function smokeTest() {
  console.log('🧪 Running smoke tests...\n');
  console.log(`API Base: ${API_BASE}\n`);
  
  const results: TestResult[] = [];
  
  for (const endpoint of criticalEndpoints) {
    console.log(`Testing: ${endpoint.name}`);
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    if (result.status === 'pass') {
      console.log(`  ✅ ${result.statusCode} ${endpoint.path}\n`);
    } else {
      console.log(`  ❌ FAIL: ${result.error}\n`);
    }
  }
  
  // Summary
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  
  console.log('\n📊 Summary:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}\n`);
  
  if (failed > 0) {
    console.error('❌ Smoke tests failed! Deployment may be broken.\n');
    process.exit(1);
  }
  
  console.log('✅ All smoke tests passed!\n');
}

smokeTest().catch(error => {
  console.error('💥 Smoke test crashed:', error);
  process.exit(1);
});

