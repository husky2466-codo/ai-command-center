#!/bin/bash
# Example: Using AI Command Center API from Claude Code
# Run this script from the AI Command Center terminal

API_BASE="http://localhost:3939/api"

echo "🤖 Claude Code API Demo"
echo "======================="
echo ""

# 1. Check if API is available
echo "1. Checking API health..."
HEALTH=$(curl -s "$API_BASE/health")
if [[ $HEALTH == *"healthy"* ]]; then
  echo "   ✅ API is healthy"
else
  echo "   ❌ API not available. Is the app running?"
  exit 1
fi
echo ""

# 2. Get app status
echo "2. Getting app status..."
curl -s "$API_BASE/status" | jq .
echo ""

# 3. List projects
echo "3. Listing projects..."
PROJECTS=$(curl -s "$API_BASE/projects?limit=3")
echo "$PROJECTS" | jq '.data[] | {name, status, progress}'
echo ""

# 4. Create a new project
echo "4. Creating test project..."
NEW_PROJECT=$(curl -s -X POST "$API_BASE/projects" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Claude Code API Demo",
    "description": "Created by Claude Code via API",
    "status": "active_focus"
  }')

PROJECT_ID=$(echo "$NEW_PROJECT" | jq -r '.data.id')
echo "   Created project: $PROJECT_ID"
echo ""

# 5. Create tasks
echo "5. Creating tasks for project..."

TASK1=$(curl -s -X POST "$API_BASE/tasks" \
  -H "Content-Type: application/json" \
  -d "{
    \"project_id\": \"$PROJECT_ID\",
    \"title\": \"Setup API integration\",
    \"energy_type\": \"deep_work\",
    \"status\": \"completed\"
  }")

TASK1_ID=$(echo "$TASK1" | jq -r '.data.id')
echo "   ✅ Task 1: Setup API integration (completed)"

TASK2=$(curl -s -X POST "$API_BASE/tasks" \
  -H "Content-Type: application/json" \
  -d "{
    \"project_id\": \"$PROJECT_ID\",
    \"title\": \"Write example script\",
    \"energy_type\": \"creative\",
    \"status\": \"in_progress\"
  }")

TASK2_ID=$(echo "$TASK2" | jq -r '.data.id')
echo "   🔄 Task 2: Write example script (in progress)"

TASK3=$(curl -s -X POST "$API_BASE/tasks" \
  -H "Content-Type: application/json" \
  -d "{
    \"project_id\": \"$PROJECT_ID\",
    \"title\": \"Test API endpoints\",
    \"energy_type\": \"quick_win\",
    \"status\": \"pending\"
  }")

TASK3_ID=$(echo "$TASK3" | jq -r '.data.id')
echo "   ⏳ Task 3: Test API endpoints (pending)"
echo ""

# 6. Update project progress
echo "6. Updating project progress..."
curl -s -X PUT "$API_BASE/projects/$PROJECT_ID" \
  -H "Content-Type: application/json" \
  -d '{"progress": 0.66}' | jq '.data | {name, status, progress}'
echo ""

# 7. Get project details with tasks
echo "7. Getting project details with tasks..."
PROJECT_DETAILS=$(curl -s "$API_BASE/projects/$PROJECT_ID")
echo "$PROJECT_DETAILS" | jq '{
  project: .data.name,
  progress: .data.progress,
  tasks: [.data.tasks[] | {title, status}]
}'
echo ""

# 8. Create a reminder
echo "8. Creating reminder..."
TOMORROW=$(date -d tomorrow +%Y-%m-%dT14:00:00.000Z)
REMINDER=$(curl -s -X POST "$API_BASE/reminders" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Review API demo project\",
    \"description\": \"Check progress on Claude Code API integration\",
    \"due_at\": \"$TOMORROW\"
  }")

REMINDER_ID=$(echo "$REMINDER" | jq -r '.data.id')
echo "   Created reminder: $REMINDER_ID (due tomorrow at 2 PM)"
echo ""

# 9. Add to knowledge base
echo "9. Creating knowledge article..."
ARTICLE=$(curl -s -X POST "$API_BASE/knowledge/articles" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Using AI Command Center API",
    "content": "# API Usage\n\nThe HTTP API allows external tools to control the app...",
    "tags": "api,automation,claude-code"
  }' 2>/dev/null || echo '{"success":false,"error":"Not implemented yet"}')

if [[ $ARTICLE == *"success\":true"* ]]; then
  echo "   ✅ Article created"
else
  echo "   ℹ️  Knowledge article creation not yet implemented"
fi
echo ""

# 10. Search knowledge base
echo "10. Searching knowledge base..."
curl -s -X POST "$API_BASE/knowledge/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "API", "limit": 3}' | jq '.data[] | {title, tags}'
echo ""

echo "======================="
echo "✅ Demo complete!"
echo ""
echo "Project ID: $PROJECT_ID"
echo "Task IDs: $TASK1_ID, $TASK2_ID, $TASK3_ID"
echo "Reminder ID: $REMINDER_ID"
echo ""
echo "💡 Tip: Check the app to see all the changes!"
echo ""
echo "To clean up:"
echo "  curl -X DELETE $API_BASE/projects/$PROJECT_ID"
echo "  curl -X PUT $API_BASE/reminders/$REMINDER_ID -H 'Content-Type: application/json' -d '{\"status\":\"completed\"}'"
