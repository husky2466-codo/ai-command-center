# Phase 7: Integration & Testing

**Status**: Not Started
**Timeline**: Week 16
**Priority**: P0 (Critical - Final validation)
**Estimated Effort**: 5 days

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md)

---

## Final Design Audit

Phase 7 includes a comprehensive design system audit before release.

### Pre-Release Design Checklist

#### Global Checks
- [ ] All screens use `--bg-primary` (#1a1a2e) background
- [ ] All CTAs use `--accent-gold` (#ffd700)
- [ ] No light backgrounds anywhere in the app
- [ ] All icons are line art style (2px stroke, no fills)
- [ ] Hexagon motifs used for badges and accents
- [ ] Typography uses Inter/Outfit font family

#### Module-Specific Checks
- [ ] Dashboard: Gold accent, command center feel
- [ ] Projects: Purple accent, energy badges correct
- [ ] Reminders: Green accent, snooze escalation colors
- [ ] Relationships: Pink accent, freshness indicators
- [ ] Meetings: Blue accent, prep sheet styling
- [ ] Knowledge: Cyan accent, folder tree styling
- [ ] Chat: Gold accent, Memory Lane bar gradient
- [ ] Admin: Gray accent, status indicators
- [ ] Memory Lane: Rose accent, type badges hexagonal
- [ ] Vision: Purple accent, Eye icon branding
- [ ] Chain Runner: Blue accent, quality badges

#### Visual Consistency Audit
- [ ] All cards have consistent border radius (8px)
- [ ] All hover states show gold border
- [ ] All focus states have gold ring
- [ ] All modals use consistent backdrop (rgba(0,0,0,0.7))
- [ ] All loading states use shared spinner component
- [ ] All error states use `--status-error` (#ef4444)

#### CSS Variable Audit
- [ ] Run grep for hardcoded hex colors in CSS files
- [ ] Verify all colors reference CSS variables
- [ ] Check for any non-standard shadows or borders

### Design Sign-Off
- [ ] Visual review passed
- [ ] Consistency audit passed
- [ ] No hardcoded values found
- [ ] Professional, not playful appearance confirmed

---

## Overview

Phase 7 is the final phase focused on connecting all modules, end-to-end testing, performance optimization, documentation updates, and release preparation. This ensures the complete AI Command Center works as a cohesive system.

## Objectives

1. Wire all cross-module connections
2. Implement Memory Lane injection in Chat
3. Complete all pending integrations
4. Run comprehensive E2E tests
5. Performance testing and optimization
6. Update documentation
7. Create release build

## Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 7 DEPENDENCIES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  From Phases 1-6:                                               │
│  • ALL modules complete and functional individually            │
│  • ALL services implemented                                    │
│  • ALL database tables and indexes created                     │
│  • ALL shared components finished                              │
│                                                                 │
│  External Dependencies:                                         │
│  • Playwright or Electron testing framework                    │
│  • electron-builder for release packaging                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Cross-Module Connections

```
┌─────────────────────────────────────────────────────────────────┐
│                  INTEGRATION REQUIREMENTS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Memory Lane -> Chat                                            │
│  ├─ Inject relevant memories into conversation context         │
│  ├─ Display Memory Lane bar with retrieved memories            │
│  └─ Track memory recalls in session                            │
│                                                                 │
│  Meetings -> Relationships                                      │
│  ├─ Link participants to contacts                              │
│  ├─ Pull context for prep sheets                               │
│  └─ Update last_contact_at after meetings                      │
│                                                                 │
│  Projects -> Reminders                                          │
│  ├─ Create reminders from tasks                                │
│  ├─ Link reminders to tasks                                    │
│  └─ Show linked reminders in task view                         │
│                                                                 │
│  Knowledge -> Relationships                                     │
│  ├─ Suggest contacts for sharing                               │
│  └─ Link articles to relevant contacts                         │
│                                                                 │
│  Dashboard -> All Modules                                       │
│  ├─ Aggregate data from all services                           │
│  ├─ Calculate goal alignment                                   │
│  └─ Generate comprehensive brief                               │
│                                                                 │
│  Vision -> Knowledge                                            │
│  ├─ Save captures to knowledge base                            │
│  └─ Display in dashboard widget                                │
│                                                                 │
│  Chain Runner -> Admin                                          │
│  ├─ Track session tokens                                       │
│  └─ Log to token_usage table                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Detailed Task Checklist

### Day 1: Cross-Module Wiring

#### Memory Lane -> Chat Integration
- [ ] Implement memory context injection in ChatService
  - [ ] Before sending message, call retrieveMemories(query)
  - [ ] Format memories as system context
  - [ ] Include in API request
- [ ] Track memory usage in session_recalls table
  - [ ] Log which memories were injected
  - [ ] Record similarity scores and ranks
- [ ] Update Memory Lane bar to show active memories
- [ ] Enable feedback to update rankings

#### Meetings -> Relationships Integration
- [ ] Verify participant linking works bidirectionally
  - [ ] Navigate from meeting to contact
  - [ ] Navigate from contact to meetings
- [ ] Implement prep sheet context pull
  - [ ] Pull contact.professional_background
  - [ ] Pull contact.context
  - [ ] Pull last interaction
- [ ] Update last_contact_at after meeting completion
- [ ] Test full flow

### Day 2: Additional Integrations

#### Projects -> Reminders Integration
- [ ] Add "Create Reminder" button in TaskItem
- [ ] Implement reminder creation from task
  - [ ] Pre-fill title from task
  - [ ] Link via source_type/source_id
- [ ] Show linked reminders in task detail
- [ ] Handle reminder completion -> task update

#### Knowledge -> Relationships Integration
- [ ] Implement contact suggestion in ArticleView
  - [ ] Match article tags/content to contact interests
  - [ ] Display suggested contacts
- [ ] Add "Link to Contact" action
- [ ] Show linked articles in ContactLinks

#### Vision -> Knowledge Integration
- [ ] Add "Save to Knowledge" button in VisionApp
  - [ ] Capture frame and analysis
  - [ ] Open save dialog
  - [ ] Create knowledge article
- [ ] Create Vision widget for dashboard

#### Chain Runner -> Admin Integration
- [ ] Add session logging to Chain Runner
  - [ ] Log session start/end
  - [ ] Track token usage
- [ ] Display in Admin TokenUsageTab
- [ ] Create chain session browser (optional)

### Day 3: End-to-End Testing

#### Test Scenarios
- [ ] Fresh Install Flow
  - [ ] App starts without database
  - [ ] Migrations run successfully
  - [ ] Default folders created
  - [ ] Onboarding completes
- [ ] Memory Extraction Flow
  - [ ] Parse Claude Code sessions
  - [ ] Extract memories
  - [ ] Generate embeddings
  - [ ] Store in database
- [ ] Memory Retrieval Flow
  - [ ] Query in Chat
  - [ ] Memories retrieved
  - [ ] Displayed in Memory Lane bar
  - [ ] Feedback updates rankings
- [ ] Project Workflow
  - [ ] Create space, project, tasks
  - [ ] Filter by energy type
  - [ ] Mark tasks complete
  - [ ] Progress updates
- [ ] Reminder Workflow
  - [ ] Create with natural language
  - [ ] Snooze reminder
  - [ ] Complete recurring
  - [ ] Notification fires
- [ ] Meeting Workflow
  - [ ] Create meeting with participants
  - [ ] Generate prep sheet
  - [ ] Add notes
  - [ ] Extract commitments
- [ ] Dashboard Load
  - [ ] All widgets populate
  - [ ] Brief generates
  - [ ] No errors in console

#### Automated Tests
- [ ] Set up testing framework (Playwright/Spectron)
- [ ] Write E2E tests for critical paths
- [ ] Run tests in CI (if applicable)

### Day 4: Performance & Optimization

#### Performance Testing
- [ ] Measure app startup time
  - [ ] Target: < 3 seconds
- [ ] Test with large datasets
  - [ ] 1000+ memories
  - [ ] 500+ contacts
  - [ ] 100+ sessions
- [ ] Profile memory usage
- [ ] Identify bottlenecks

#### Optimizations
- [ ] Add database indexes if missing
- [ ] Implement lazy loading for lists
- [ ] Add virtualization for long lists
- [ ] Cache frequently accessed data
- [ ] Optimize embedding calculations
- [ ] Reduce re-renders with React.memo

#### Memory Leak Check
- [ ] Run app for extended period
- [ ] Monitor memory in Task Manager
- [ ] Fix any leaks found

### Day 5: Documentation & Release

#### Documentation Updates
- [ ] Update CLAUDE.md with all new features
- [ ] Document all IPC channels
- [ ] Create user guide (optional)
- [ ] Update README with current status

#### Release Build
- [ ] Run `npm run build:electron`
- [ ] Test release build on clean machine
- [ ] Verify all features work in release mode
- [ ] Create installer if needed

#### Final Checklist
- [ ] All modules accessible via sidebar
- [ ] No console errors on startup
- [ ] No TypeScript/ESLint errors
- [ ] All services initialize properly
- [ ] Database migrations run on first launch
- [ ] Auto-extraction cron job works
- [ ] Brief generation works
- [ ] Ollama integration works (or graceful fallback)

## Deliverables

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 7 DELIVERABLES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Integration                                                    │
│  ├─ Memory injection in Chat working                           │
│  ├─ All cross-module links functional                          │
│  └─ Dashboard aggregating all data                             │
│                                                                 │
│  Testing                                                        │
│  ├─ E2E tests for critical paths                               │
│  ├─ Performance within targets                                 │
│  └─ No memory leaks                                            │
│                                                                 │
│  Documentation                                                  │
│  ├─ Updated CLAUDE.md                                          │
│  ├─ IPC channel documentation                                  │
│  └─ User guide (optional)                                      │
│                                                                 │
│  Release                                                        │
│  ├─ Clean build with no errors                                 │
│  ├─ Tested on fresh install                                    │
│  └─ Ready for distribution                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Integration bugs surface late | Medium | High | Test early, often |
| Performance issues at scale | Medium | Medium | Profile and optimize |
| Release build differences | Low | Medium | Test release build daily |

## Success Criteria

- [ ] All 11 modules accessible and functional
- [ ] Memory injection works in Chat
- [ ] All cross-module links navigate correctly
- [ ] Dashboard displays accurate aggregated data
- [ ] No console errors on normal operation
- [ ] App starts in < 3 seconds
- [ ] No memory leaks after 1 hour use
- [ ] Release build works on clean Windows machine
- [ ] Documentation reflects current state

## Final Integration Tests

### Critical Path Tests

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Memory to Chat | Query about past decision | Relevant memory appears in bar |
| Meeting Prep | Open meeting with participants | Prep sheet shows contact context |
| Task to Reminder | Create reminder from task | Reminder linked, shows in reminders |
| Knowledge Share | View article | Contact suggestions appear |
| Dashboard Load | Open app | All widgets populated, no errors |
| Brief Generation | Check at 8:30 AM or trigger manual | Brief contains relevant summary |
| Vision Save | Capture frame, save to knowledge | Article created with image |

### Performance Targets

| Metric | Target | Measured |
|--------|--------|----------|
| Cold start | < 3s | [ ] |
| Hot navigation | < 200ms | [ ] |
| Memory retrieval | < 500ms | [ ] |
| Brief generation | < 5s | [ ] |
| Memory usage (idle) | < 300MB | [ ] |

## Files Modified

### Modified Files (~10)
```
src/services/ChatService.js - Memory injection
src/components/chat/ChatApp.jsx - Memory Lane integration
src/components/meetings/PrepSheet.jsx - Contact context
src/components/projects/TaskItem.jsx - Reminder link
src/components/knowledge/ArticleView.jsx - Share suggestions
src/components/vision/VisionApp.jsx - Save to knowledge
src/components/chain-runner/ChainRunner.jsx - Session logging
CLAUDE.md - Updated documentation
README.md - Updated documentation (if exists)
```

## Agent Assignment

- Primary: `electron-react-dev`
- For Vision debugging: `vision-tester`
- For Chain Runner issues: `chain-config`

---
**Notes**: Phase 7 is about polish and ensuring everything works together. Don't add new features here - focus on making existing features bulletproof. The goal is a release-ready application that feels cohesive and professional.
