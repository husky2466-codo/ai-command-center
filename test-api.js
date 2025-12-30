/**
 * Simple test script for the HTTP API Server
 * Run this with: node test-api.js
 *
 * Make sure the AI Command Center app is running first!
 */

const API_BASE = 'http://localhost:3939/api';
const API_KEY = process.env.API_SERVER_KEY || null;

const headers = {
  'Content-Type': 'application/json'
};

if (API_KEY) {
  headers['X-API-Key'] = API_KEY;
}

async function test(name, method, endpoint, body = null) {
  console.log(`\n🧪 Testing: ${name}`);
  console.log(`   ${method} ${endpoint}`);

  try {
    const options = {
      method,
      headers
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();

    if (data.success) {
      console.log('   ✅ Success');
      console.log('   Response:', JSON.stringify(data, null, 2).substring(0, 200));
    } else {
      console.log('   ❌ Failed:', data.error);
    }

    return data;
  } catch (err) {
    console.log('   ❌ Error:', err.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 AI Command Center API Test Suite');
  console.log('=====================================');

  // Health check
  await test('Health Check', 'GET', '/health');

  // Status
  await test('App Status', 'GET', '/status');

  // List projects
  const projects = await test('List Projects', 'GET', '/projects?limit=5');

  // List tasks
  await test('List Tasks', 'GET', '/tasks?limit=5');

  // List reminders
  await test('List Reminders', 'GET', '/reminders?limit=5');

  // List contacts
  await test('List Contacts', 'GET', '/contacts?limit=5');

  // List spaces
  await test('List Spaces', 'GET', '/spaces');

  // List knowledge folders
  await test('List Knowledge Folders', 'GET', '/knowledge/folders');

  // List knowledge articles
  await test('List Knowledge Articles', 'GET', '/knowledge/articles?limit=5');

  // List memories
  await test('List Memories', 'GET', '/memories?limit=5');

  // Search knowledge
  await test('Search Knowledge', 'POST', '/knowledge/search', {
    query: 'API',
    limit: 3
  });

  // Create a test project
  const newProject = await test('Create Project', 'POST', '/projects', {
    name: 'API Test Project',
    description: 'Created via API test',
    status: 'on_deck'
  });

  if (newProject?.success) {
    const projectId = newProject.data.id;

    // Update project
    await test('Update Project', 'PUT', `/projects/${projectId}`, {
      status: 'active_focus',
      progress: 0.25
    });

    // Create task
    const newTask = await test('Create Task', 'POST', '/tasks', {
      project_id: projectId,
      title: 'Test task from API',
      energy_type: 'quick_win',
      status: 'pending'
    });

    if (newTask?.success) {
      const taskId = newTask.data.id;

      // Complete task
      await test('Complete Task', 'PUT', `/tasks/${taskId}`, {
        status: 'completed'
      });
    }

    // Get project with tasks
    await test('Get Project Details', 'GET', `/projects/${projectId}`);

    // Delete project
    await test('Delete Project', 'DELETE', `/projects/${projectId}`);
  }

  // Create reminder
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const newReminder = await test('Create Reminder', 'POST', '/reminders', {
    title: 'Test API reminder',
    description: 'Created via API test',
    due_at: tomorrow.toISOString()
  });

  if (newReminder?.success) {
    const reminderId = newReminder.data.id;

    // Update reminder
    await test('Complete Reminder', 'PUT', `/reminders/${reminderId}`, {
      status: 'completed'
    });
  }

  console.log('\n=====================================');
  console.log('✅ Test suite complete!');
  console.log('\nNote: Some endpoints (calendar, email) require Google account setup');
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
