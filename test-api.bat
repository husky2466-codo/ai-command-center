@echo off
REM API Endpoint Test Script for Windows
REM Tests all major endpoints after app starts

set BASE_URL=http://localhost:3939/api

echo === Testing AI Command Center API ===
echo.

REM Test 1: Health Check
echo 1. Testing /api/health
curl -s "%BASE_URL%/health"
echo.
echo.

REM Test 2: Status
echo 2. Testing /api/status
curl -s "%BASE_URL%/status"
echo.
echo.

REM Test 3: Projects
echo 3. Testing /api/projects
curl -s "%BASE_URL%/projects?limit=3"
echo.
echo.

REM Test 4: Tasks
echo 4. Testing /api/tasks
curl -s "%BASE_URL%/tasks?limit=3"
echo.
echo.

REM Test 5: Reminders
echo 5. Testing /api/reminders
curl -s "%BASE_URL%/reminders?limit=3"
echo.
echo.

REM Test 6: Knowledge Folders
echo 6. Testing /api/knowledge/folders
curl -s "%BASE_URL%/knowledge/folders"
echo.
echo.

REM Test 7: Contacts
echo 7. Testing /api/contacts
curl -s "%BASE_URL%/contacts?limit=3"
echo.
echo.

REM Test 8: Spaces
echo 8. Testing /api/spaces
curl -s "%BASE_URL%/spaces"
echo.
echo.

REM Test 9: Memories
echo 9. Testing /api/memories
curl -s "%BASE_URL%/memories?limit=3"
echo.
echo.

REM Test 10: DGX Connections
echo 10. Testing /api/dgx/connections
curl -s "%BASE_URL%/dgx/connections"
echo.
echo.

REM Test 11: Calendar Events
echo 11. Testing /api/calendar/events
curl -s "%BASE_URL%/calendar/events"
echo.
echo.

echo === All tests complete ===
pause
