# AI Agent Service - Smart Backend

**Status:** Planned (Future Implementation)
**Priority:** High
**Estimated Effort:** 2-3 days
**Dependencies:** Claude CLI Integration (COMPLETED)

---

## Overview

An intelligent AI Agent layer that proactively manages workflows by watching events, detecting user intent, and automatically creating tasks, meetings, reminders, and calendar events.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Command Center                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              AI Agent Service (NEW)                     │ │
│  │                                                         │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  │ │
│  │  │   Intent    │  │   Action    │  │   Proactive    │  │ │
│  │  │  Detector   │  │  Executor   │  │   Watcher      │  │ │
│  │  └─────────────┘  └─────────────┘  └────────────────┘  │ │
│  │         │                │                  │           │ │
│  │         └────────────────┼──────────────────┘           │ │
│  │                          ▼                              │ │
│  │                  Claude CLI Backend                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                   │
│         ┌────────────────┼────────────────┐                 │
│         ▼                ▼                ▼                 │
│  ┌───────────┐    ┌───────────┐    ┌───────────┐           │
│  │  Tasks    │    │ Calendar  │    │  Email    │           │
│  │  API      │    │  API      │    │  API      │           │
│  └───────────┘    └───────────┘    └───────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## Smart Behaviors

| Trigger | AI Detects | Auto-Action |
|---------|------------|-------------|
| New email arrives | "Meeting request for Tuesday" | Creates calendar event, sends to-do |
| User types in chat | "Remind me to call John tomorrow" | Creates reminder for tomorrow |
| Email with deadline | "Report due by Friday 5pm" | Creates task with deadline |
| Calendar invite | "Prep needed for client meeting" | Creates prep task 1 day before |
| User says | "Schedule a meeting with Sarah" | Creates calendar event, drafts invite |
| Email from VIP contact | High importance detected | Flags, creates follow-up task |
| Recurring pattern | "Weekly standup" | Suggests recurring event |

---

## Key Components

### 1. AI Agent Service
**File:** `electron/services/aiAgentService.cjs`

```javascript
const claudeCliService = require('./claudeCliService.cjs');
const EventEmitter = require('events');

class AIAgentService extends EventEmitter {
  constructor() {
    super();
    this.watchers = new Map();
    this.actionQueue = [];
  }

  // Watch for events from various sources
  registerWatcher(source, handler) {}

  // Detect intent from any input
  async detectIntent(input, context) {}

  // Execute detected action
  async executeAction(intent, data) {}

  // Process incoming email
  async processEmail(email) {}

  // Natural language command
  async processCommand(text) {}
}
```

### 2. Intent Detector
```javascript
async function detectIntent(input, context) {
  const result = await claudeCliService.query(`
    You are an AI assistant for a productivity app.
    Analyze this input and determine the user's intent.

    Context: ${JSON.stringify(context)}
    Input: "${input}"

    Return JSON with:
    {
      "intent": "create_task" | "create_meeting" | "create_reminder" | "create_event" | "send_email" | "no_action",
      "confidence": 0.0-1.0,
      "extracted_data": {
        "title": "string",
        "description": "string",
        "date": "ISO date string or null",
        "time": "HH:MM or null",
        "duration": "minutes or null",
        "participants": ["email addresses"],
        "priority": "low" | "medium" | "high",
        "energy_type": "low" | "medium" | "deep_work" | "creative"
      },
      "reasoning": "why this intent was detected"
    }
  `, { maxTokens: 1024 });

  return JSON.parse(result.content);
}
```

### 3. Email Processor
```javascript
async function processNewEmail(email) {
  const analysis = await claudeCliService.query(`
    Analyze this email for actionable items:

    From: ${email.from}
    Subject: ${email.subject}
    Date: ${email.date}
    Body: ${email.snippet}

    Determine:
    1. Is a meeting being requested? Extract date/time/participants
    2. Are there deadlines mentioned? Extract dates
    3. Urgency level (1-10)
    4. Required actions:
       - create_meeting: { title, date, time, duration, participants }
       - create_task: { title, due_date, priority }
       - create_reminder: { title, remind_at }
       - flag_important: boolean
       - no_action: boolean

    Return JSON with analysis and recommended actions.
  `, { maxTokens: 1024 });

  const result = JSON.parse(analysis.content);

  // Auto-execute actions
  if (result.actions.create_meeting) {
    await fetch('http://localhost:3939/api/calendar/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.actions.create_meeting)
    });
  }

  if (result.actions.create_task) {
    await fetch('http://localhost:3939/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.actions.create_task)
    });
  }

  return result;
}
```

### 4. Natural Language Command Handler
```javascript
async function handleNaturalLanguage(text) {
  const intent = await detectIntent(text, {
    currentDate: new Date().toISOString(),
    userTimezone: 'America/New_York'
  });

  if (intent.confidence < 0.7) {
    return { success: false, message: "I'm not sure what you want. Can you clarify?" };
  }

  switch (intent.intent) {
    case 'create_task':
      return await createTask(intent.extracted_data);
    case 'create_meeting':
      return await createMeeting(intent.extracted_data);
    case 'create_reminder':
      return await createReminder(intent.extracted_data);
    case 'create_event':
      return await createCalendarEvent(intent.extracted_data);
    default:
      return { success: false, message: "No action needed" };
  }
}

// Examples:
// "Schedule lunch with Mike next Tuesday"
//   → Creates calendar event: "Lunch with Mike" on Tuesday 12pm

// "I need to finish the proposal by Friday"
//   → Creates task: "Finish proposal" due Friday, energy_type: deep_work

// "Remind me to call the dentist"
//   → Creates reminder: "Call dentist" for tomorrow 9am
```

---

## Integration Points

### Email Watcher
```javascript
// In electron/main.cjs - hook into email sync
emailSyncService.on('new-emails', async (emails) => {
  for (const email of emails) {
    await aiAgentService.processEmail(email);
  }
});
```

### Chat Integration
```javascript
// In ChatApp.jsx - detect commands in chat
const handleSendMessage = async (text) => {
  // Check if it's a command-like message
  const intent = await window.electronAPI.aiAgent.detectIntent(text);

  if (intent.confidence > 0.8 && intent.intent !== 'no_action') {
    // Show confirmation UI
    setConfirmAction(intent);
  } else {
    // Normal chat flow
    await sendToChat(text);
  }
};
```

### Global Command Bar (Future)
```javascript
// Cmd+K or Ctrl+K global command bar
// Type anything, AI figures out what to do
```

---

## UI Components

### 1. Action Confirmation Modal
When AI detects an intent, show confirmation:
```
┌─────────────────────────────────────────────────┐
│  AI detected an action                          │
├─────────────────────────────────────────────────┤
│                                                 │
│  "Schedule lunch with Mike next Tuesday"        │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │  📅 Create Calendar Event               │   │
│  │                                         │   │
│  │  Title: Lunch with Mike                 │   │
│  │  Date: Tuesday, Jan 7, 2026             │   │
│  │  Time: 12:00 PM                         │   │
│  │  Duration: 1 hour                       │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [Cancel]                    [Create Event]     │
└─────────────────────────────────────────────────┘
```

### 2. Smart Suggestions Panel
Show AI suggestions in sidebar:
```
┌─────────────────────────────────────────────────┐
│  🤖 AI Suggestions                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  📧 New email from John Smith                   │
│     "Meeting request for project review"        │
│     [Create Meeting] [Ignore]                   │
│                                                 │
│  📅 Upcoming: Client Call (Tomorrow 2pm)        │
│     Suggestion: Create prep task?               │
│     [Create Task] [Dismiss]                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 3. Activity Feed
Show what AI has done:
```
┌─────────────────────────────────────────────────┐
│  🤖 AI Activity                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  ✓ Created task "Review proposal" from email   │
│    2 minutes ago                                │
│                                                 │
│  ✓ Created meeting "Team Standup" from email   │
│    15 minutes ago                               │
│                                                 │
│  ✓ Added reminder "Call dentist"               │
│    1 hour ago                                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Settings

```javascript
// User preferences for AI Agent
{
  aiAgent: {
    enabled: true,
    autoCreateFromEmail: true,      // Auto-create events from emails
    confirmBeforeAction: true,       // Show confirmation before creating
    emailImportanceThreshold: 7,     // 1-10, only process important emails
    watchNewEmails: true,
    watchCalendarInvites: true,
    naturalLanguageCommands: true,
    suggestPreTasks: true,           // Suggest prep tasks before meetings
  }
}
```

---

## Implementation Phases

### Phase 1: Core Service (Day 1)
- [ ] Create `aiAgentService.cjs`
- [ ] Implement intent detection with Claude CLI
- [ ] Add action executor for tasks/meetings/reminders

### Phase 2: Email Integration (Day 1-2)
- [ ] Hook into email sync service
- [ ] Implement email analysis
- [ ] Auto-create calendar events from meeting requests
- [ ] Auto-create tasks from emails with deadlines

### Phase 3: Natural Language Commands (Day 2)
- [ ] Add NL command parsing
- [ ] Integrate with Chat app
- [ ] Add confirmation UI

### Phase 4: UI & Polish (Day 2-3)
- [ ] Action confirmation modal
- [ ] Smart suggestions panel
- [ ] Activity feed
- [ ] Settings panel

---

## API Endpoints (New)

```
POST /api/ai-agent/detect-intent
  body: { input: string, context: object }
  returns: { intent, confidence, extracted_data }

POST /api/ai-agent/execute
  body: { intent: string, data: object }
  returns: { success, created_item }

POST /api/ai-agent/process-email
  body: { email_id: string }
  returns: { analysis, actions_taken }

GET /api/ai-agent/suggestions
  returns: { suggestions: [...] }

GET /api/ai-agent/activity
  returns: { activities: [...] }
```

---

## Success Metrics

1. **Time Saved**: Reduce manual task/event creation by 50%
2. **Email Processing**: Auto-handle 80% of meeting requests
3. **Accuracy**: 90%+ intent detection accuracy
4. **User Satisfaction**: Confirmations prevent unwanted actions

---

## Notes

- Uses Claude CLI (subscription) for all AI processing - no additional cost
- All actions require confirmation by default (can be disabled)
- Activity log provides transparency into AI actions
- Integrates with existing ACC modules (Tasks, Calendar, Reminders)

---

*Created: 2026-01-01*
*Last Updated: 2026-01-01*
*Status: Awaiting Implementation*
