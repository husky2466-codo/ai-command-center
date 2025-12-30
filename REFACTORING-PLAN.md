# AI Command Center - Comprehensive Refactoring Plan

## Executive Summary

This document outlines a 4-phase refactoring plan to improve code quality, maintainability, and testability of the AI Command Center application.

**Timeline:** 4 Phases (executed by parallel agents)
**Goal:** Break up monoliths, add testing, improve architecture, verify with debug mode

---

## Phase 1: Break Up Monoliths (Critical Priority)

### 1.1 Email.jsx (2,262 lines → 8 components)

**Current State:** Single massive component handling inbox, compose, templates, labels, signatures, search, settings, keyboard shortcuts.

**Target Structure:**
```
src/components/email/
├── Email.jsx (200 lines) - Container/orchestrator only
├── EmailInbox.jsx - List view, filters, selection
├── EmailCompose.jsx - Rich editor, send, drafts
├── EmailView.jsx - Message detail view
├── EmailFolders.jsx - Labels, saved searches sidebar
├── EmailTemplates.jsx - Template manager (already exists, verify integration)
├── EmailSignatures.jsx - Signature manager (already exists)
├── EmailSettings.jsx - Email preferences (already exists)
├── EmailKeyboardHelp.jsx - Keyboard shortcuts modal
├── hooks/
│   ├── useEmailState.js - Centralized state management
│   ├── useEmailKeyboardShortcuts.js (existing)
│   ├── useEmailFilters.js - Filter logic
│   └── useEmailSelection.js - Selection logic
└── utils/
    ├── emailUtils.js - Helper functions
    └── emailConstants.js - Status codes, labels
```

**Refactoring Steps:**
1. Extract state management into useEmailState hook
2. Extract EmailInbox component (list + filters)
3. Extract EmailCompose component (editor)
4. Extract EmailView component (detail)
5. Extract EmailFolders component (sidebar)
6. Update Email.jsx to be thin orchestrator
7. Test each component individually
8. Run debug mode to verify

### 1.2 googleAccountService.cjs (2,823 lines → 3 services)

**Current State:** Monolithic service mixing Gmail, Contacts, Calendar APIs.

**Target Structure:**
```
electron/services/google/
├── index.cjs - Service registry/exports
├── gmailService.cjs (~600 lines) - Email operations
│   ├── listEmails()
│   ├── getEmail()
│   ├── sendEmail()
│   ├── moveToTrash()
│   ├── markAsRead()
│   └── searchEmails()
├── googleContactsService.cjs (~400 lines) - Contact operations
│   ├── listContacts()
│   ├── getContact()
│   ├── createContact()
│   └── updateContact()
├── googleCalendarService.cjs (~400 lines) - Calendar operations
│   ├── listEvents()
│   ├── getEvent()
│   ├── createEvent()
│   └── updateEvent()
└── googleBaseService.cjs (~200 lines) - Shared auth, token handling
```

**Refactoring Steps:**
1. Create electron/services/google/ directory
2. Extract googleBaseService with common OAuth logic
3. Extract gmailService with email-specific methods
4. Extract googleContactsService
5. Extract googleCalendarService
6. Update imports in main.cjs and ipc handlers
7. Test each service independently
8. Run debug mode to verify

### 1.3 apiServer.cjs (2,228 lines → routes/controllers)

**Current State:** All Express routes in single file.

**Target Structure:**
```
electron/api/
├── server.cjs (100 lines) - Express setup, middleware
├── middleware/
│   ├── auth.cjs - API key validation
│   ├── errorHandler.cjs - Error responses
│   └── requestLogger.cjs - Request logging
├── routes/
│   ├── index.cjs - Route aggregator
│   ├── projects.cjs - /api/projects/*
│   ├── tasks.cjs - /api/tasks/*
│   ├── reminders.cjs - /api/reminders/*
│   ├── knowledge.cjs - /api/knowledge/*
│   ├── contacts.cjs - /api/contacts/*
│   ├── memories.cjs - /api/memories/*
│   ├── dgx.cjs - /api/dgx/*
│   ├── calendar.cjs - /api/calendar/*
│   └── emails.cjs - /api/emails/*
└── controllers/
    ├── projectController.cjs
    ├── taskController.cjs
    └── [etc.]
```

**Refactoring Steps:**
1. Create electron/api/ directory structure
2. Extract middleware (auth, error handler, logger)
3. Extract route files by domain
4. Create thin controllers or inline handlers
5. Update main.cjs to use new server module
6. Test each route independently
7. Run debug mode to verify API still works

### 1.4 ChainRunner.jsx (1,225 lines → components)

**Current State:** Large component with config, execution, output, modals.

**Target Structure:**
```
src/components/chain-runner/
├── ChainRunner.jsx (300 lines) - Orchestrator
├── ChainConfig.jsx - Agent configuration
├── ChainExecution.jsx - Run control, progress
├── ChainOutput.jsx - Output display
├── ChainPromptGenerator.jsx - Batch prompt UI
├── ChainQualityValidator.jsx - Quality badges
├── modals/
│   ├── ConfigModal.jsx (existing)
│   ├── RAGExportModal.jsx (existing)
│   └── [others as needed]
├── hooks/
│   ├── useChainState.js - State management
│   ├── useChainExecution.js - Execution logic
│   └── usePromptGeneration.js - Prompt batch logic
└── utils/
    ├── promptGenerator.js (existing)
    ├── qualityValidator.js (existing)
    └── ragExporter.js (existing)
```

---

## Phase 2: Code Quality Improvements

### 2.1 TypeScript/JSDoc Type Checking

**Approach:** Gradual TypeScript adoption using JSDoc + @ts-check

**Steps:**
1. Add `// @ts-check` to all .js/.jsx files
2. Create `src/types/` directory with .d.ts files
3. Add JSDoc types to function parameters
4. Add return type annotations
5. Fix type errors as they appear

**Example:**
```javascript
// @ts-check

/**
 * @typedef {Object} Email
 * @property {string} id
 * @property {string} subject
 * @property {string} from
 * @property {string} body
 * @property {boolean} read
 */

/**
 * Fetch emails from Gmail
 * @param {string} accountId - Google account ID
 * @param {number} [limit=50] - Max emails to fetch
 * @returns {Promise<Email[]>}
 */
async function fetchEmails(accountId, limit = 50) {
  // ...
}
```

### 2.2 Logging Framework

**Library:** winston (or electron-log for Electron-specific)

**Implementation:**
```javascript
// electron/utils/logger.cjs
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

module.exports = logger;
```

**Usage:**
```javascript
const logger = require('./utils/logger.cjs');

logger.info('Starting API server', { port: 3939 });
logger.error('Failed to connect', { error: err.message });
logger.debug('Query executed', { sql, params });
```

### 2.3 Centralized Error Handling

**Create AppError class:**
```javascript
// src/utils/AppError.js
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'UNKNOWN_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

// Usage
throw new AppError('Email not found', 404, 'EMAIL_NOT_FOUND');
```

**Express error middleware:**
```javascript
// electron/api/middleware/errorHandler.cjs
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  logger.error('API Error', {
    message: err.message,
    code: err.code,
    stack: err.stack,
    path: req.path
  });

  res.status(statusCode).json({
    success: false,
    error: message,
    code: err.code
  });
}
```

---

## Phase 3: Testing Infrastructure

### 3.1 Test Framework Setup

**Install dependencies:**
```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
```

**jest.config.js:**
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss)$': 'identity-obj-proxy'
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/**/*.test.{js,jsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  }
};
```

### 3.2 Component Tests

**Target Coverage:** 50%+ for critical components

**Priority Components:**
1. Shared components (Button, Modal, Card, Input)
2. Email components (after refactor)
3. ChainRunner components (after refactor)
4. Dashboard widgets
5. Projects components

**Example Test:**
```javascript
// src/components/shared/Button.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant classes', () => {
    render(<Button variant="primary">Primary</Button>);
    expect(screen.getByText('Primary')).toHaveClass('btn-primary');
  });

  it('disables when loading', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### 3.3 Service Tests

**Priority Services:**
1. ProjectService
2. EmailService (Gmail wrapper)
3. ChainRunner execution logic
4. Quality validator
5. RAG exporter

**Example Test:**
```javascript
// src/services/ProjectService.test.js
import { projectService } from './ProjectService';

// Mock DataService
jest.mock('./DataService', () => ({
  dataService: {
    query: jest.fn(),
    run: jest.fn(),
    get: jest.fn()
  }
}));

describe('ProjectService', () => {
  describe('getProjects', () => {
    it('returns projects with filters', async () => {
      const mockProjects = [{ id: '1', name: 'Test' }];
      dataService.query.mockResolvedValue(mockProjects);

      const result = await projectService.getProjects({ status: 'active' });

      expect(result).toEqual(mockProjects);
      expect(dataService.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = ?'),
        ['active']
      );
    });
  });
});
```

### 3.4 Integration Tests

**Test critical flows:**
1. Create project → Create task → Mark complete
2. Email compose → Send → Verify sent
3. Chain config → Run → Export RAG
4. Google OAuth → Fetch emails

---

## Phase 4: Debug Mode Verification

### 4.1 Debug Checklist

After each refactoring phase, run in debug mode and verify:

**Startup:**
- [ ] App launches without errors
- [ ] All windows render correctly
- [ ] No console errors on startup
- [ ] Database migrations complete
- [ ] API server starts on :3939

**Navigation:**
- [ ] Sidebar navigation works
- [ ] All modules load correctly
- [ ] Split view functions properly
- [ ] Tab switching works
- [ ] Theme switching works

**Core Features:**
- [ ] Terminal opens and accepts input
- [ ] Prompt Crafter refinement works
- [ ] Email loads (or shows auth prompt)
- [ ] Projects CRUD works
- [ ] Tasks CRUD works
- [ ] Reminders CRUD works
- [ ] Knowledge base works
- [ ] Chat sends messages
- [ ] Vision captures webcam
- [ ] Chain Runner executes

**API Endpoints:**
- [ ] GET /api/health returns 200
- [ ] GET /api/status returns counts
- [ ] All CRUD endpoints work

### 4.2 Debug Commands

```bash
# Run with full console output
npm run dev:electron

# Check for TypeScript errors
npx tsc --noEmit

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Check for lint errors
npm run lint

# Build to verify no issues
npm run build
```

### 4.3 Issue Tracking

Create GitHub issues for each bug found:

```markdown
## Bug Report

**Component:** [Email/ChainRunner/etc.]
**Severity:** [Critical/High/Medium/Low]

**Description:**
[What went wrong]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Console Errors:**
```
[Paste any console errors]
```

**Fix Applied:**
[Description of fix, if resolved]
```

---

## Agent Assignment

### Agent 1: Email Refactoring
- Break up Email.jsx (2,262 lines)
- Create 8 focused components
- Extract hooks for state management
- Write tests for each component

### Agent 2: Backend Services Refactoring
- Split googleAccountService.cjs (2,823 lines)
- Modularize apiServer.cjs (2,228 lines)
- Add logging framework
- Add error handling

### Agent 3: ChainRunner + Code Quality
- Split ChainRunner.jsx (1,225 lines)
- Add TypeScript/JSDoc types
- Improve service patterns

### Agent 4: Testing Infrastructure
- Set up Jest + React Testing Library
- Write shared component tests
- Write service tests
- Create integration test framework

### Agent 5: Debug & Verification
- Run debug mode after each phase
- Identify and log issues
- Coordinate fixes
- Final verification

---

## Success Criteria

### Phase 1 Complete When:
- [ ] No file > 500 lines in src/components/
- [ ] No service file > 600 lines
- [ ] All modules still functional
- [ ] Debug mode shows no errors

### Phase 2 Complete When:
- [ ] All files have @ts-check
- [ ] Logger used throughout codebase
- [ ] Centralized error handling in place
- [ ] No console.log statements (use logger)

### Phase 3 Complete When:
- [ ] Test framework configured
- [ ] 50%+ code coverage for components
- [ ] Critical services have tests
- [ ] Tests pass in CI

### Phase 4 Complete When:
- [ ] All features work in debug mode
- [ ] No console errors
- [ ] API endpoints respond correctly
- [ ] Performance acceptable

---

## Notes

- **Backup first:** Create git branch before refactoring
- **Incremental:** Commit after each component extraction
- **Test early:** Run app after each change
- **Document:** Update CLAUDE.md with changes
