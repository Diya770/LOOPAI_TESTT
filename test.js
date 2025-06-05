const axios = require('axios');
const assert = require('assert');

const BASE_URL = 'http://localhost:5000';

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testIngestion() {
    try {
        // Test 1: Basic ingestion
        console.log('Test 1: Basic ingestion');
        const response1 = await axios.post(`${BASE_URL}/ingest`, {
            ids: [1, 2, 3, 4, 5],
            priority: 'MEDIUM'
        });
        assert(response1.data.ingestion_id);
        console.log('✓ Basic ingestion successful');

        // Test 2: Invalid input validation
        console.log('\nTest 2: Invalid input validation');
        try {
            await axios.post(`${BASE_URL}/ingest`, {
                ids: [1, 2, 3],
                priority: 'INVALID'
            });
            assert.fail('Should have thrown error');
        } catch (error) {
            assert.strictEqual(error.response.status, 400);
            console.log('✓ Invalid priority rejected');
        }

        // Test 3: ID range validation
        console.log('\nTest 3: ID range validation');
        try {
            await axios.post(`${BASE_URL}/ingest`, {
                ids: [0, 1, 2],
                priority: 'HIGH'
            });
            assert.fail('Should have thrown error');
        } catch (error) {
            assert.strictEqual(error.response.status, 400);
            console.log('✓ Invalid ID range rejected');
        }

        // Test 4: Priority-based processing
        console.log('\nTest 4: Priority-based processing');
        const lowPriority = await axios.post(`${BASE_URL}/ingest`, {
            ids: [6, 7, 8],
            priority: 'LOW'
        });
        await sleep(1000); // Wait 1 second
        const highPriority = await axios.post(`${BASE_URL}/ingest`, {
            ids: [9, 10, 11],
            priority: 'HIGH'
        });

        // Check status after 6 seconds (should see HIGH priority batch processed)
        await sleep(6000);
        const highStatus = await axios.get(`${BASE_URL}/status/${highPriority.data.ingestion_id}`);
        const lowStatus = await axios.get(`${BASE_URL}/status/${lowPriority.data.ingestion_id}`);
        
        assert(highStatus.data.batches[0].status === 'completed' || highStatus.data.batches[0].status === 'triggered');
        assert(lowStatus.data.batches[0].status === 'yet_to_start');
        console.log('✓ Priority-based processing working');

        // Test 5: Rate limiting
        console.log('\nTest 5: Rate limiting');
        const startTime = Date.now();
        const batch1 = await axios.post(`${BASE_URL}/ingest`, {
            ids: [12, 13, 14],
            priority: 'MEDIUM'
        });
        const batch2 = await axios.post(`${BASE_URL}/ingest`, {
            ids: [15, 16, 17],
            priority: 'MEDIUM'
        });

        await sleep(6000);
        const batch1Status = await axios.get(`${BASE_URL}/status/${batch1.data.ingestion_id}`);
        const batch2Status = await axios.get(`${BASE_URL}/status/${batch2.data.ingestion_id}`);
        
        assert(batch1Status.data.batches[0].status === 'completed');
        assert(batch2Status.data.batches[0].status === 'triggered');
        console.log('✓ Rate limiting working');

        // Test 6: Status transitions
        console.log('\nTest 6: Status transitions');
        const statusTest = await axios.post(`${BASE_URL}/ingest`, {
            ids: [18, 19, 20],
            priority: 'MEDIUM'
        });

        // Check initial status
        const initialStatus = await axios.get(`${BASE_URL}/status/${statusTest.data.ingestion_id}`);
        assert(initialStatus.data.status === 'yet_to_start' || initialStatus.data.status === 'triggered');

        // Wait for completion
        await sleep(6000);
        const finalStatus = await axios.get(`${BASE_URL}/status/${statusTest.data.ingestion_id}`);
        assert(finalStatus.data.status === 'completed');
        console.log('✓ Status transitions working');

        console.log('\nAll tests passed successfully! 🎉');

    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}

testIngestion(); 