// Simple test script to verify API endpoints work
import http from 'http';
import { URL } from 'url';

// Test the API endpoints
async function testAPI() {
  console.log("Testing API endpoints...\n");

  // Create a tape
  const createResponse = await makeRequest('/v1/tapes', 'POST', {});
  console.log("Create tape response:", createResponse);

  if (createResponse && createResponse.id) {
    const tapeId = createResponse.id;

    // Add entries to the tape
    const addEntriesResponse = await makeRequest(`/v1/tapes/${tapeId}/entries`, 'POST', [10, 20, 30]);
    console.log("Add entries response:", addEntriesResponse);

    // Get tape details
    const getTapeResponse = await makeRequest(`/v1/tapes/${tapeId}`, 'GET');
    console.log("Get tape response:", getTapeResponse);

    // Get total only
    const getTotalResponse = await makeRequest(`/v1/tapes/${tapeId}/total`, 'GET');
    console.log("Get total response:", getTotalResponse);

    // Delete one entry
    if (getTapeResponse.entries && getTapeResponse.entries.length > 0) {
      const firstEntry = getTapeResponse.entries[0];
      const deleteEntryResponse = await makeRequest(`/v1/tapes/${tapeId}/entries/${firstEntry}`, 'DELETE');
      console.log("Delete entry response:", deleteEntryResponse);
    }

    // Get tape after deletion
    const getTapeAfterDeleteResponse = await makeRequest(`/v1/tapes/${tapeId}`, 'GET');
    console.log("Get tape after delete response:", getTapeAfterDeleteResponse);

    // Delete all entries
    const deleteAllResponse = await makeRequest(`/v1/tapes/${tapeId}/entries`, 'DELETE');
    console.log("Delete all entries response:", deleteAllResponse);

    // Get tape after deleting all
    const getTapeAfterDeleteAllResponse = await makeRequest(`/v1/tapes/${tapeId}`, 'GET');
    console.log("Get tape after delete all response:", getTapeAfterDeleteAllResponse);

    // Delete the tape
    const deleteTapeResponse = await makeRequest(`/v1/tapes/${tapeId}`, 'DELETE');
    console.log("Delete tape response:", deleteTapeResponse);
  }
}

function makeRequest(path, method, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body !== null) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);

    if (body !== null) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

// Run the test
testAPI().catch(console.error);