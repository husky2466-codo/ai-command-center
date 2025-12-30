# DGX API Test Script (PowerShell)
# Tests all DGX Spark endpoints on localhost:3939

$API_BASE = "http://localhost:3939/api"
$HEADERS = @{"Content-Type" = "application/json"}

Write-Host "=== DGX Spark API Test Suite ===" -ForegroundColor Cyan
Write-Host ""

$TESTS = 0
$PASSED = 0

function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Endpoint,
        [string]$Data,
        [string]$Description
    )

    $script:TESTS++
    Write-Host "[$script:TESTS] Testing: $Description"

    try {
        $url = "$API_BASE$Endpoint"

        if ($Data) {
            $response = Invoke-RestMethod -Uri $url -Method $Method -Headers $HEADERS -Body $Data -ErrorAction Stop
        } else {
            $response = Invoke-RestMethod -Uri $url -Method $Method -ErrorAction Stop
        }

        if ($response.success) {
            Write-Host "✓ PASS" -ForegroundColor Green
            $script:PASSED++
            return $response.data
        } else {
            Write-Host "✗ FAIL - " $response.error -ForegroundColor Red
            return $null
        }
    } catch {
        Write-Host "✗ FAIL - " $_.Exception.Message -ForegroundColor Red
        return $null
    }
    Write-Host ""
}

Write-Host "--- System Health ---"
Test-Endpoint "GET" "/health" "" "Health check"
Test-Endpoint "GET" "/status" "" "App status"

Write-Host "--- DGX Connections ---"
Test-Endpoint "GET" "/dgx/connections" "" "List connections"

# Create a test connection
$CONNECTION_DATA = @{
    name = "Test DGX"
    hostname = "localhost"
    username = "testuser"
    ssh_key_path = "C:/temp/test_key"
    port = 22
} | ConvertTo-Json

$connResult = Test-Endpoint "POST" "/dgx/connections" $CONNECTION_DATA "Create connection"
$CONN_ID = if ($connResult) { $connResult.id } else { "test-conn-id" }

Test-Endpoint "GET" "/dgx/connections/$CONN_ID" "" "Get specific connection"
Test-Endpoint "GET" "/dgx/status" "" "Get active connection status"
Test-Endpoint "GET" "/dgx/status/$CONN_ID" "" "Get connection status by ID"

Write-Host "--- DGX Projects ---"
Test-Endpoint "GET" "/dgx/projects" "" "List all projects"
Test-Endpoint "GET" "/dgx/projects?connection_id=$CONN_ID" "" "List projects for connection"

$PROJECT_DATA = @{
    connection_id = $CONN_ID
    name = "Test Project"
    description = "Testing DGX API"
    project_type = "computer_vision"
    remote_path = "/workspace/test"
    status = "active"
} | ConvertTo-Json

$projResult = Test-Endpoint "POST" "/dgx/projects" $PROJECT_DATA "Create project"
$PROJ_ID = if ($projResult) { $projResult.id } else { "test-proj-id" }

Test-Endpoint "GET" "/dgx/projects/$PROJ_ID" "" "Get specific project"

$UPDATE_PROJECT = @{
    status = "active"
    description = "Updated description"
} | ConvertTo-Json

Test-Endpoint "PUT" "/dgx/projects/$PROJ_ID" $UPDATE_PROJECT "Update project"

Write-Host "--- DGX Training Jobs ---"
Test-Endpoint "GET" "/dgx/jobs" "" "List all jobs"
Test-Endpoint "GET" "/dgx/jobs?project_id=$PROJ_ID" "" "List jobs for project"

$JOB_DATA = @{
    project_id = $PROJ_ID
    name = "Test Training Run"
    model_name = "resnet50"
    status = "pending"
    config = @{
        epochs = 10
        batch_size = 32
    }
} | ConvertTo-Json

$jobResult = Test-Endpoint "POST" "/dgx/jobs" $JOB_DATA "Create job"
$JOB_ID = if ($jobResult) { $jobResult.id } else { "test-job-id" }

Test-Endpoint "GET" "/dgx/jobs/$JOB_ID" "" "Get specific job"

$UPDATE_JOB_STATUS = @{
    status = "running"
    container_id = "abc123"
} | ConvertTo-Json

Test-Endpoint "PUT" "/dgx/jobs/$JOB_ID" $UPDATE_JOB_STATUS "Update job to running"

$UPDATE_JOB_METRICS = @{
    metrics = @{
        epoch = 5
        train_loss = 0.421
        val_loss = 0.456
        val_accuracy = 0.89
    }
} | ConvertTo-Json

Test-Endpoint "PUT" "/dgx/jobs/$JOB_ID" $UPDATE_JOB_METRICS "Update job metrics"

$COMPLETE_JOB = @{
    status = "completed"
    metrics = @{
        final_accuracy = 0.92
    }
} | ConvertTo-Json

Test-Endpoint "PUT" "/dgx/jobs/$JOB_ID" $COMPLETE_JOB "Complete job"

Write-Host "--- Cleanup ---"
Test-Endpoint "DELETE" "/dgx/jobs/$JOB_ID" "" "Delete job"
Test-Endpoint "DELETE" "/dgx/projects/$PROJ_ID" "" "Delete project"
Test-Endpoint "DELETE" "/dgx/connections/$CONN_ID" "" "Delete connection"

Write-Host "==================================="
Write-Host "Tests Passed: $PASSED / $TESTS"
if ($PASSED -eq $TESTS) {
    Write-Host "All tests passed!" -ForegroundColor Green
} else {
    Write-Host "Some tests failed." -ForegroundColor Red
}
