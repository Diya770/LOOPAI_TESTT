const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(bodyParser.json());

const PORT = 5000;

// In-memory store for ingestion and batch statuses
const ingestionStore = {};

// Priority queue for processing
const priorityQueue = [];

// Rate limit settings
const RATE_LIMIT_MS = 5000; // 5 seconds
let lastProcessedTime = 0;

// Priority weights
const PRIORITY_WEIGHTS = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1
};

// Ingestion API
app.post('/ingest', (req, res) => {
    const { ids, priority } = req.body;

    // Validate input
    if (!Array.isArray(ids) || ids.length === 0 || !['HIGH', 'MEDIUM', 'LOW'].includes(priority)) {
        return res.status(400).json({ error: 'Invalid input' });
    }

    // Validate ID range
    if (!ids.every(id => Number.isInteger(id) && id >= 1 && id <= 1000000007)) {
        return res.status(400).json({ error: 'IDs must be integers between 1 and 10^9+7' });
    }

    const ingestionId = uuidv4();
    const timestamp = Date.now();

    ingestionStore[ingestionId] = {
        status: 'yet_to_start',
        batches: [],
        priority,
        timestamp
    };

    // Process IDs in batches of 3
    for (let i = 0; i < ids.length; i += 3) {
        const batchIds = ids.slice(i, i + 3);
        const batchId = uuidv4();
        ingestionStore[ingestionId].batches.push({
            batch_id: batchId,
            ids: batchIds,
            status: 'yet_to_start'
        });
    }

    // Add to priority queue
    priorityQueue.push({
        ingestionId,
        priority,
        timestamp
    });

    // Sort priority queue
    priorityQueue.sort((a, b) => {
        if (PRIORITY_WEIGHTS[b.priority] !== PRIORITY_WEIGHTS[a.priority]) {
            return PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
        }
        return a.timestamp - b.timestamp;
    });

    // Start processing if not already running
    if (priorityQueue.length === 1) {
        processNextBatch();
    }

    res.json({ ingestion_id: ingestionId });
});

// Function to process next batch
async function processNextBatch() {
    if (priorityQueue.length === 0) return;

    const { ingestionId } = priorityQueue[0];
    const ingestion = ingestionStore[ingestionId];
    
    // Find next batch to process
    const nextBatch = ingestion.batches.find(batch => batch.status === 'yet_to_start');
    if (!nextBatch) {
        priorityQueue.shift();
        processNextBatch();
        return;
    }

    const currentTime = Date.now();

    // Respect rate limit
    if (currentTime - lastProcessedTime < RATE_LIMIT_MS) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - (currentTime - lastProcessedTime)));
    }

    lastProcessedTime = Date.now();
    nextBatch.status = 'triggered';

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 * nextBatch.ids.length)); // 1 second per ID

    nextBatch.status = 'completed';

    // Update overall status
    const allCompleted = ingestion.batches.every(batch => batch.status === 'completed');
    const anyTriggered = ingestion.batches.some(batch => batch.status === 'triggered');
    
    if (allCompleted) {
        ingestion.status = 'completed';
        priorityQueue.shift();
    } else if (anyTriggered) {
        ingestion.status = 'triggered';
    }

    // Process next batch
    processNextBatch();
}

// Status API
app.get('/status/:ingestionId', (req, res) => {
    const { ingestionId } = req.params;

    if (!ingestionStore[ingestionId]) {
        return res.status(404).json({ error: 'Ingestion ID not found' });
    }

    const ingestion = ingestionStore[ingestionId];
    
    // Determine overall status
    let overallStatus = 'yet_to_start';
    if (ingestion.batches.some(batch => batch.status === 'triggered')) {
        overallStatus = 'triggered';
    } else if (ingestion.batches.every(batch => batch.status === 'completed')) {
        overallStatus = 'completed';
    }

    res.json({
        ingestion_id: ingestionId,
        status: overallStatus,
        batches: ingestion.batches
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});