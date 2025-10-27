/**
 * Session Probe
 * 
 * Tests that the session handshake works correctly after deployment.
 * This is critical for user authentication to work properly.
 */

import axios from 'axios';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password';

async function probeSession() {
  console.log('🔐 Probing session handshake...\n');
  console.log(`API Base: ${API_BASE}`);
  console.log(`Admin Email: ${ADMIN_EMAIL}\n`);
  
  try {
    // Step 1: Try to get current session (should be 401 if not logged in)
    console.log('Step 1: GET /api/v1/session (unauthenticated)');
    try {
      const unauthedResponse = await axios.get(`${API_BASE}/api/v1/session`, {
        validateStatus: () => true,
      });
      console.log(`   Status: ${unauthedResponse.status}`);
      
      if (unauthedResponse.status === 401) {
        console.log('   ✅ Correctly returns 401 when not authenticated\n');
      } else {
        console.log(`   ⚠️  Expected 401, got ${unauthedResponse.status}`);
      }
    } catch (e) {
      console.log(`   ⚠️  Request failed: ${(e as Error).message}`);
    }
    
    // Step 2: Login
    console.log('Step 2: POST /users/sign_in (login)');
    const loginResponse = await axios.post(`${API_BASE}/users/sign_in`, {
      user: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
    }, {
      validateStatus: () => true,
    });
    
    console.log(`   Status: ${loginResponse.status}`);
    
    if (loginResponse.status !== 200 && loginResponse.status !== 201) {
      console.error(`   ❌ Login failed with status ${loginResponse.status}`);
      console.error('   Response:', loginResponse.data);
      process.exit(1);
    }
    
    console.log('   ✅ Login successful\n');
    
    // Step 3: Verify session (should return user info)
    console.log('Step 3: GET /api/v1/session (authenticated)');
    const sessionResponse = await axios.get(`${API_BASE}/api/v1/session`, {
      withCredentials: true,
      validateStatus: () => true,
    });
    
    console.log(`   Status: ${sessionResponse.status}`);
    
    if (sessionResponse.status === 200) {
      console.log('   ✅ Session endpoint returns 200 with user info');
      if (sessionResponse.data?.data) {
        console.log(`   User: ${sessionResponse.data.data.email || 'Unknown'}`);
      }
      console.log('\n✅ Session handshake probe passed!\n');
    } else {
      console.error(`   ❌ Session endpoint returned ${sessionResponse.status}`);
      console.error('   This usually means:');
      console.error('   • Session cookie is not being set');
      console.error('   • CORS is blocking credentials');
      console.error('   • Session endpoint is missing/wrong\n');
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error('\n💥 Session probe crashed:', error.message);
    process.exit(1);
  }
}

probeSession();

