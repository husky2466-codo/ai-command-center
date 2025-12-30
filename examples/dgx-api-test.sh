#!/bin/bash
# DGX API Test Script
# Tests all DGX Spark endpoints on localhost:3939

API_BASE="http://localhost:3939/api"
CONTENT_TYPE="Content-Type: application/json"

echo "=== DGX Spark API Test Suite ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test counter
TESTS=0
PASSED=0

test_endpoint() {
  TESTS=$((TESTS + 1))
  METHOD=$1
  ENDPOINT=$2
  DATA=$3
  DESCRIPTION=$4

  echo "[$TESTS] Testing: $DESCRIPTION"

  if [ -z "$DATA" ]; then
    RESPONSE=$(curl -s -X $METHOD "$API_BASE$ENDPOINT")
  else
    RESPONSE=$(curl -s -X $METHOD "$API_BASE$ENDPOINT" -H "$CONTENT_TYPE" -d "$DATA")
  fi

  if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC}"
    echo "Response: $RESPONSE"
  fi
  echo ""
}

echo "--- System Health ---"
test_endpoint "GET" "/health" "" "Health check"
test_endpoint "GET" "/status" "" "App status"

echo "--- DGX Connections ---"
test_endpoint "GET" "/dgx/connections" "" "List connections"

# Create a test connection
CONNECTION_DATA='{
  "name": "Test DGX",
  "hostname": "localhost",
  "username": "testuser",
  "ssh_key_path": "/tmp/test_key",
  "port": 22
}'
test_endpoint "POST" "/dgx/connections" "$CONNECTION_DATA" "Create connection"

# Extract connection ID from last response (would need jq in real script)
# For demo purposes, using placeholder
CONN_ID="test-conn-id"

test_endpoint "GET" "/dgx/connections/$CONN_ID" "" "Get specific connection"
test_endpoint "GET" "/dgx/status" "" "Get active connection status"
test_endpoint "GET" "/dgx/status/$CONN_ID" "" "Get connection status by ID"

echo "--- DGX Projects ---"
test_endpoint "GET" "/dgx/projects" "" "List all projects"
test_endpoint "GET" "/dgx/projects?connection_id=$CONN_ID" "" "List projects for connection"

PROJECT_DATA='{
  "connection_id": "'$CONN_ID'",
  "name": "Test Project",
  "description": "Testing DGX API",
  "project_type": "computer_vision",
  "remote_path": "/workspace/test"
}'
test_endpoint "POST" "/dgx/projects" "$PROJECT_DATA" "Create project"

PROJ_ID="test-proj-id"
test_endpoint "GET" "/dgx/projects/$PROJ_ID" "" "Get specific project"

UPDATE_PROJECT='{"status": "active", "description": "Updated description"}'
test_endpoint "PUT" "/dgx/projects/$PROJ_ID" "$UPDATE_PROJECT" "Update project"

echo "--- DGX Training Jobs ---"
test_endpoint "GET" "/dgx/jobs" "" "List all jobs"
test_endpoint "GET" "/dgx/jobs?project_id=$PROJ_ID" "" "List jobs for project"

JOB_DATA='{
  "project_id": "'$PROJ_ID'",
  "name": "Test Training Run",
  "model_name": "resnet50",
  "status": "pending",
  "config": {"epochs": 10, "batch_size": 32}
}'
test_endpoint "POST" "/dgx/jobs" "$JOB_DATA" "Create job"

JOB_ID="test-job-id"
test_endpoint "GET" "/dgx/jobs/$JOB_ID" "" "Get specific job"

UPDATE_JOB_STATUS='{"status": "running", "container_id": "abc123"}'
test_endpoint "PUT" "/dgx/jobs/$JOB_ID" "$UPDATE_JOB_STATUS" "Update job to running"

UPDATE_JOB_METRICS='{
  "metrics": {
    "epoch": 5,
    "train_loss": 0.421,
    "val_loss": 0.456,
    "val_accuracy": 0.89
  }
}'
test_endpoint "PUT" "/dgx/jobs/$JOB_ID" "$UPDATE_JOB_METRICS" "Update job metrics"

COMPLETE_JOB='{"status": "completed", "metrics": {"final_accuracy": 0.92}}'
test_endpoint "PUT" "/dgx/jobs/$JOB_ID" "$COMPLETE_JOB" "Complete job"

echo "--- Cleanup ---"
test_endpoint "DELETE" "/dgx/jobs/$JOB_ID" "" "Delete job"
test_endpoint "DELETE" "/dgx/projects/$PROJ_ID" "" "Delete project"
test_endpoint "DELETE" "/dgx/connections/$CONN_ID" "" "Delete connection"

echo "==================================="
echo "Tests Passed: $PASSED / $TESTS"
if [ $PASSED -eq $TESTS ]; then
  echo -e "${GREEN}All tests passed!${NC}"
else
  echo -e "${RED}Some tests failed.${NC}"
fi
