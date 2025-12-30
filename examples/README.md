# AI Command Center API Examples

This directory contains example scripts and usage patterns for the AI Command Center HTTP API.

## Prerequisites

1. AI Command Center app must be running
2. API server is running on `http://localhost:3939`
3. Database is initialized (happens automatically on first launch)

## Test Scripts

### DGX Spark API Tests

Test all DGX Spark endpoints (connections, projects, jobs, metrics).

**Windows (PowerShell):**
```powershell
.\dgx-api-test.ps1
```

**Linux/Mac (Bash):**
```bash
chmod +x dgx-api-test.sh
./dgx-api-test.sh
```

These scripts will:
1. Create a test DGX connection
2. Create a test project
3. Create a training job
4. Update job status and metrics
5. Clean up all test data

**Note:** The scripts test the API endpoints but won't actually connect to a real DGX (requires valid SSH credentials).

## Manual Testing with curl

### Check API Health
```bash
curl http://localhost:3939/api/health
```

### Create DGX Connection
```bash
curl -X POST http://localhost:3939/api/dgx/connections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My DGX A100",
    "hostname": "dgx.example.com",
    "username": "ubuntu",
    "ssh_key_path": "/path/to/ssh/key",
    "port": 22
  }'
```

### List Connections
```bash
curl http://localhost:3939/api/dgx/connections
```

### Connect to DGX (SSH)
```bash
curl -X POST http://localhost:3939/api/dgx/connect/CONNECTION_ID
```

### Get GPU Metrics
```bash
curl http://localhost:3939/api/dgx/metrics/CONNECTION_ID
```

### Execute Command
```bash
curl -X POST http://localhost:3939/api/dgx/exec/CONNECTION_ID \
  -H "Content-Type: application/json" \
  -d '{"command": "nvidia-smi"}'
```

### Create Training Job
```bash
curl -X POST http://localhost:3939/api/dgx/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "PROJECT_ID",
    "name": "Experiment 1",
    "model_name": "vit_base_patch16_224",
    "status": "pending",
    "config": {"epochs": 100, "batch_size": 32}
  }'
```

### Update Job Status
```bash
# Start training (sets started_at)
curl -X PUT http://localhost:3939/api/dgx/jobs/JOB_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "running", "container_id": "docker-abc123"}'

# Update metrics
curl -X PUT http://localhost:3939/api/dgx/jobs/JOB_ID \
  -H "Content-Type: application/json" \
  -d '{
    "metrics": {
      "epoch": 25,
      "train_loss": 0.342,
      "val_accuracy": 0.921
    }
  }'

# Complete (sets completed_at)
curl -X PUT http://localhost:3939/api/dgx/jobs/JOB_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

## API Authentication (Optional)

If `API_SERVER_KEY` is set in the app's `.env` file, include the API key header:

**PowerShell:**
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "X-API-Key" = "your-secret-key"
}
Invoke-RestMethod -Uri "http://localhost:3939/api/dgx/connections" -Headers $headers
```

**Bash:**
```bash
curl -H "X-API-Key: your-secret-key" http://localhost:3939/api/dgx/connections
```

## Integration Examples

### Claude Code via Terminal

Claude Code can use these APIs directly from the terminal:

```bash
# Check active DGX connections
curl http://localhost:3939/api/dgx/connections

# Monitor GPU usage
curl http://localhost:3939/api/dgx/metrics/CONNECTION_ID

# List training jobs
curl http://localhost:3939/api/dgx/jobs
```

### Python Script

```python
import requests

API_BASE = "http://localhost:3939/api"

# Get connections
response = requests.get(f"{API_BASE}/dgx/connections")
connections = response.json()["data"]

# Get metrics for first connection
if connections:
    conn_id = connections[0]["id"]
    metrics = requests.get(f"{API_BASE}/dgx/metrics/{conn_id}")
    print(metrics.json())
```

### Node.js Script

```javascript
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3939/api';

async function getConnections() {
  const response = await fetch(`${API_BASE}/dgx/connections`);
  const data = await response.json();
  return data.data;
}

async function getMetrics(connectionId) {
  const response = await fetch(`${API_BASE}/dgx/metrics/${connectionId}`);
  const data = await response.json();
  return data.data;
}

// Usage
getConnections().then(connections => {
  if (connections.length > 0) {
    return getMetrics(connections[0].id);
  }
}).then(metrics => {
  console.log('GPU Metrics:', metrics);
});
```

## Error Handling

All API responses follow this format:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

HTTP status codes:
- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `401` - Unauthorized (invalid API key)
- `404` - Not Found
- `500` - Internal Server Error

## Common Workflows

### 1. Setup New DGX
```bash
# Create connection
CONN=$(curl -X POST http://localhost:3939/api/dgx/connections \
  -H "Content-Type: application/json" \
  -d '{"name": "DGX-1", "hostname": "10.0.1.100", "username": "admin", "ssh_key_path": "/home/user/.ssh/dgx"}')

CONN_ID=$(echo $CONN | jq -r '.data.id')

# Connect
curl -X POST http://localhost:3939/api/dgx/connect/$CONN_ID

# Verify
curl http://localhost:3939/api/dgx/status/$CONN_ID
```

### 2. Monitor Training
```bash
# Get real-time metrics
watch -n 5 'curl -s http://localhost:3939/api/dgx/metrics/CONNECTION_ID | jq .'

# Get metrics history for charting
curl "http://localhost:3939/api/dgx/metrics/CONNECTION_ID/history?hours=24" | jq .
```

### 3. Batch Job Management
```bash
# Create multiple jobs
for i in {1..5}; do
  curl -X POST http://localhost:3939/api/dgx/jobs \
    -H "Content-Type: application/json" \
    -d "{
      \"project_id\": \"$PROJECT_ID\",
      \"name\": \"Experiment $i\",
      \"model_name\": \"resnet50\",
      \"status\": \"pending\"
    }"
done

# List pending jobs
curl "http://localhost:3939/api/dgx/jobs?project_id=$PROJECT_ID" | jq '.data[] | select(.status=="pending")'
```

## Troubleshooting

### API Server Not Running
```bash
curl http://localhost:3939/api/health
```
If this fails, check:
1. AI Command Center app is running
2. Check Electron console for API server errors
3. Check if port 3939 is already in use

### Connection Failed
```bash
curl http://localhost:3939/api/dgx/status/CONNECTION_ID
```
If `connected: false`:
1. Verify SSH key path is correct
2. Verify hostname is reachable
3. Check SSH key permissions (should be 600)
4. Test SSH manually: `ssh -i /path/to/key user@hostname`

### Metrics Not Available
Ensure:
1. Connection is active (`is_active: 1`)
2. DGX has `nvidia-smi` installed
3. User has permissions to run `nvidia-smi`

## Documentation

- Full API reference: `D:\Projects\CLAUDE.md`
- Implementation details: `D:\Projects\ai-command-center\DGX-API-IMPLEMENTATION.md`
- Database schema: `D:\Projects\ai-command-center\electron\database\migrations\006_dgx_spark.cjs`
