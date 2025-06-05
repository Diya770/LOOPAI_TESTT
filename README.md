# Data Ingestion API System

A RESTful API system for handling data ingestion requests with priority-based processing and rate limiting.

## Features

- Priority-based batch processing (HIGH, MEDIUM, LOW)
- Rate limiting (1 batch per 5 seconds)
- Asynchronous processing
- Status tracking for ingestion requests
- Input validation
- Comprehensive test suite

## Prerequisites

- Node.js (v12 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd <repository-name>
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

1. Start the server:
```bash
node app.js
```

The server will start on http://localhost:5000

## API Endpoints

### 1. Ingestion API
- **Endpoint**: POST /ingest
- **Input**:
```json
{
    "ids": [1, 2, 3, 4, 5],
    "priority": "HIGH"
}
```
- **Output**:
```json
{
    "ingestion_id": "uuid-string"
}
```

### 2. Status API
- **Endpoint**: GET /status/:ingestion_id
- **Output**:
```json
{
    "ingestion_id": "uuid-string",
    "status": "yet_to_start|triggered|completed",
    "batches": [
        {
            "batch_id": "uuid-string",
            "ids": [1, 2, 3],
            "status": "yet_to_start|triggered|completed"
        }
    ]
}
```

## Running Tests

Run the test suite:
```bash
node test.js
```

The test suite verifies:
- Basic ingestion functionality
- Input validation
- Priority-based processing
- Rate limiting
- Status transitions

## Design Choices

1. **Priority Queue**: Implemented using an array sorted by priority and timestamp
2. **Rate Limiting**: Enforced using a 5-second delay between batch processing
3. **Status Tracking**: Three states (yet_to_start, triggered, completed) for both batches and overall ingestion
4. **In-memory Storage**: Used for simplicity, can be replaced with a database for production
5. **Asynchronous Processing**: Implemented using async/await for clean code structure

## Error Handling

The API handles various error cases:
- Invalid priority values
- Invalid ID ranges
- Missing or malformed input
- Non-existent ingestion IDs

## Rate Limiting

- Maximum 3 IDs processed every 5 seconds
- Priority-based processing within rate limits
- Timestamp-based ordering for same priority requests 