# AI COMMAND CENTER - COMPREHENSIVE REVAMP PLAN

**Status**: Draft for Review
**Date**: 2026-01-04
**Target**: Reduce complexity, add Account Manager capabilities, consolidate from 17 to 10 tabs

---

## EXECUTIVE SUMMARY

AI Command Center has grown organically to 17 tabs with overlapping features and architectural complexity. This plan consolidates the application to 10 focused tabs (42% reduction) while adding Account Manager workflow capabilities for CRM and client relationship management.

**Key Goals:**
1. **Consolidation**: 17 tabs → 10 tabs (merge Contacts+Relationships, Calendar+Meetings, Admin+Accounts)
2. **Account Manager Features**: Client 360 view, meeting intelligence, pipeline tracking, health scoring
3. **Code Simplification**: Extract IPC handlers, split large services, standardize architecture
4. **User Experience**: Clearer navigation, integrated workflows, reduced cognitive load

---

## 1. CURRENT STATE ANALYSIS

### Current Navigation Structure (17 Tabs)

```
┌────────────────────────────────────────────────────────────────┐
│                    CURRENT TAB STRUCTURE                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MAIN (9)                                                       │
│  ├─ Dashboard                                                   │
│  ├─ Projects                                                    │
│  ├─ Reminders                                                   │
│  ├─ Relationships    ◄──┐                                       │
│  ├─ Contacts             ├─ MERGE: Redundant contact data      │
│  ├─ Meetings         ◄───┤                                      │
│  ├─ Calendar             ├─ MERGE: Both handle scheduling      │
│  ├─ Knowledge            │                                      │
│  └─ Email                │                                      │
│                          │                                      │
│  AI (1)                  │                                      │
│  └─ Chat                 │                                      │
│                          │                                      │
│  TOOLS (5)               │                                      │
│  ├─ Memory Lane      ◄───┤ INTEGRATE: Move to Chat sidebar     │
│  ├─ Vision               │                                      │
│  ├─ Chain Runner         │                                      │
│  ├─ Terminal             │                                      │
│  └─ DGX Spark            │                                      │
│                          │                                      │
│  SYSTEM (2)              │                                      │
│  ├─ Accounts         ◄───┤                                      │
│  └─ Admin                └─ MERGE: Single settings interface   │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

### Overlap & Redundancy Issues

| Current Tabs | Issue | Data Overlap |
|-------------|-------|--------------|
| Contacts + Relationships | Both store contact info | Google contacts vs. CRM entries |
| Calendar + Meetings | Both show events | `calendar_events` vs. `meetings` table |
| Admin + Accounts | Both for system config | Settings scattered across 2 UIs |
| Memory Lane (standalone) | Better as Chat context | Should be sidebar, not tab |

### Code Complexity Issues

1. **googleAccountService.cjs** - 3,100 lines (should be split into 3 services)
2. **main.cjs** - 133 IPC handlers (needs IPC router pattern)
3. **Email-OLD-BACKUP.jsx** - 2,262 lines dead code
4. **Duplicate parseGmailMessage()** - Exists in 2 files
5. **Inconsistent service patterns** - Some use BaseService, others don't

---

## 2. PROPOSED NAVIGATION STRUCTURE (10 TABS)

### New Consolidated Structure

```
┌─────────────────────────────────────────────────────────────────┐
│               NEW STREAMLINED TAB STRUCTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  WORK (5)                                                        │
│  ┌────────────────────┐                                         │
│  │ Dashboard          │  Overview, widgets, quick actions       │
│  ├────────────────────┤                                         │
│  │ Projects           │  Kanban, tasks, timelines               │
│  ├────────────────────┤                                         │
│  │ Relationships      │  **NEW CRM**: Contacts + Accounts +     │
│  │  (CRM)             │  Stakeholder mapping + Health scores    │
│  ├────────────────────┤                                         │
│  │ Schedule           │  **MERGED**: Calendar + Meetings +      │
│  │                    │  Prep sheets + Time blocking            │
│  ├────────────────────┤                                         │
│  │ Knowledge          │  Wiki, docs, AI-extracted insights      │
│  └────────────────────┘                                         │
│                                                                  │
│  COMMUNICATION (2)                                               │
│  ┌────────────────────┐                                         │
│  │ Email              │  Gmail integration, smart replies       │
│  ├────────────────────┤                                         │
│  │ Chat               │  AI assistant, context-aware            │
│  │  ├─ Memory Lane    │  **INTEGRATED**: Sidebar for history   │
│  │  └─ Reminders      │  **INTEGRATED**: Notification panel    │
│  └────────────────────┘                                         │
│                                                                  │
│  AI TOOLS (2)                                                    │
│  ┌────────────────────┐                                         │
│  │ Vision             │  Camera AI, workspace monitoring        │
│  ├────────────────────┤                                         │
│  │ Chain Runner       │  Multi-agent workflows, RAG training    │
│  └────────────────────┘                                         │
│                                                                  │
│  SYSTEM (1)                                                      │
│  ┌────────────────────┐                                         │
│  │ Settings           │  **MERGED**: Admin + Accounts + Theme   │
│  │  ├─ Accounts       │  Google OAuth, integrations             │
│  │  ├─ Preferences    │  Appearance, notifications              │
│  │  ├─ DGX Spark      │  GPU server management                  │
│  │  ├─ Terminal       │  Embedded shell                         │
│  │  └─ Advanced       │  API keys, database tools               │
│  └────────────────────┘                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tab Reduction Summary

| Before | After | Method |
|--------|-------|--------|
| 17 tabs | 10 tabs | **42% reduction** |
| Contacts + Relationships | **Relationships (CRM)** | Merged + enhanced |
| Calendar + Meetings | **Schedule** | Unified scheduling |
| Admin + Accounts | **Settings** (multi-section) | Single config hub |
| Memory Lane (tab) | **Chat sidebar** | Integrated context |
| Reminders (tab) | **Chat notification panel** | Contextual alerts |
| DGX Spark (tab) | **Settings → DGX Spark** | System tool |
| Terminal (tab) | **Settings → Terminal** | Admin tool |

---

## 3. DATA MODEL CONSOLIDATION

### Unified CRM Schema (Relationships Tab)

```
┌──────────────────────────────────────────────────────────────────┐
│                     UNIFIED CRM DATA MODEL                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐         ┌─────────────────┐                 │
│  │   CONTACTS      │◄────────┤ GOOGLE CONTACTS │                 │
│  │   (Primary)     │  sync   │  (source)       │                 │
│  ├─────────────────┤         └─────────────────┘                 │
│  │ id              │                                              │
│  │ google_id       │  (nullable - for synced)                    │
│  │ name            │                                              │
│  │ email           │                                              │
│  │ phone           │                                              │
│  │ company         │                                              │
│  │ title           │                                              │
│  │ type            │  (person | company | opportunity)           │
│  │ parent_id       │  (for org hierarchy)                        │
│  │ owner_id        │  (assigned account manager)                 │
│  └─────────────────┘                                              │
│          │                                                        │
│          ├──► ┌─────────────────┐                                │
│          │    │ STAKEHOLDER_MAP │  Relationship strength         │
│          │    ├─────────────────┤                                │
│          │    │ contact_id      │                                │
│          │    │ account_id      │                                │
│          │    │ role            │  (champion, blocker, etc.)     │
│          │    │ influence       │  (1-10 scale)                  │
│          │    │ engagement      │  (last contact date)           │
│          │    └─────────────────┘                                │
│          │                                                        │
│          ├──► ┌─────────────────┐                                │
│          │    │ HEALTH_SCORES   │  Predictive analytics          │
│          │    ├─────────────────┤                                │
│          │    │ account_id      │                                │
│          │    │ score           │  (0-100)                       │
│          │    │ trend           │  (up | down | stable)          │
│          │    │ risk_level      │  (low | medium | high)         │
│          │    │ last_touch      │  (days since contact)          │
│          │    │ next_action     │  (AI-suggested)                │
│          │    └─────────────────┘                                │
│          │                                                        │
│          └──► ┌─────────────────┐                                │
│               │ INTERACTIONS    │  Activity log                  │
│               ├─────────────────┤                                │
│               │ contact_id      │                                │
│               │ type            │  (email, meeting, call, note)  │
│               │ date            │                                │
│               │ subject         │                                │
│               │ sentiment       │  (AI-analyzed)                 │
│               │ action_items    │  (extracted)                   │
│               └─────────────────┘                                │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### Unified Scheduling Schema (Schedule Tab)

```
┌──────────────────────────────────────────────────────────────────┐
│                   UNIFIED SCHEDULING MODEL                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐         ┌─────────────────┐                 │
│  │   EVENTS        │◄────────┤ GOOGLE CALENDAR │                 │
│  │   (Primary)     │  sync   │  (source)       │                 │
│  ├─────────────────┤         └─────────────────┘                 │
│  │ id              │                                              │
│  │ google_event_id │  (nullable)                                 │
│  │ title           │                                              │
│  │ start_time      │                                              │
│  │ end_time        │                                              │
│  │ type            │  (meeting | time_block | deadline)          │
│  │ calendar_id     │  (which calendar)                           │
│  │ account_id      │  (linked client/account)                    │
│  │ location        │  (Zoom, physical, etc.)                     │
│  │ attendees_json  │  (participant list)                         │
│  └─────────────────┘                                              │
│          │                                                        │
│          ├──► ┌─────────────────┐                                │
│          │    │ PREP_SHEETS     │  Meeting preparation           │
│          │    ├─────────────────┤                                │
│          │    │ event_id        │                                │
│          │    │ agenda          │  (AI-generated or manual)      │
│          │    │ talking_points  │  (key topics)                  │
│          │    │ background      │  (client history)              │
│          │    │ objectives      │  (meeting goals)               │
│          │    │ follow_ups      │  (action items)                │
│          │    └─────────────────┘                                │
│          │                                                        │
│          └──► ┌─────────────────┐                                │
│               │ TRANSCRIPTS     │  Fireflies/Fathom integration  │
│               ├─────────────────┤                                │
│               │ event_id        │                                │
│               │ service         │  (fireflies | fathom)          │
│               │ transcript_url  │                                │
│               │ summary         │  (AI-extracted)                │
│               │ action_items    │  (auto-parsed)                 │
│               │ sentiment       │  (client mood)                 │
│               └─────────────────┘                                │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. ACCOUNT MANAGER FEATURES (NEW)

### Feature Integration Matrix

| Feature | Tab | Data Source | AI Component | Priority |
|---------|-----|-------------|--------------|----------|
| **Client 360 View** | Relationships | contacts, interactions, health_scores | Insight generation | P0 |
| **Meeting Intelligence** | Schedule | transcripts, prep_sheets | Action item extraction | P0 |
| **Health Scoring** | Relationships | engagement metrics, email sentiment | Predictive alerts | P1 |
| **Stakeholder Mapping** | Relationships | stakeholder_map, org charts | Relationship strength | P1 |
| **Pipeline Tracking** | Relationships | opportunities, forecast | Revenue prediction | P1 |
| **QBR/EBR Generation** | Relationships | All account data | Report assembly | P2 |
| **AI Email Assist** | Email | Templates, sentiment | Smart compose | P2 |
| **Task Automation** | Projects | Workflows, triggers | Auto-assignment | P2 |

### Client 360 View Wireframe

```
┌────────────────────────────────────────────────────────────────────────┐
│  RELATIONSHIPS (CRM)                                    [+ New Contact] │
├─────────────────┬──────────────────────────────────────────────────────┤
│                 │                                                       │
│  CONTACTS LIST  │  ACME CORP - CLIENT 360 VIEW                          │
│                 │                                                       │
│ ┌─────────────┐ │  ┌────────────────────────────────────────────────┐  │
│ │ Acme Corp   │ │  │  HEALTH SCORE: 78 ▲ +5 (30 days)               │  │
│ │ ▲ 78        │◄┼──┤  Trend: Growing | Risk: Low | Next Touch: 2d   │  │
│ └─────────────┘ │  └────────────────────────────────────────────────┘  │
│ ┌─────────────┐ │                                                       │
│ │ TechStart   │ │  ┌─────────────┬─────────────┬─────────────┐        │
│ │ ▼ 52        │ │  │ STAKEHOLDERS│ ACTIVITY    │ PIPELINE    │        │
│ └─────────────┘ │  └─────────────┴─────────────┴─────────────┘        │
│ ┌─────────────┐ │                                                       │
│ │ GlobalCo    │ │  ┌──────────────────────────────────────────┐        │
│ │ → 65        │ │  │  John Smith - CEO (Champion)             │        │
│ └─────────────┘ │  │  ★★★★★ Influence: 9/10                   │        │
│                 │  │  Last contact: 3 days ago (lunch)        │        │
│ [All] [Active]  │  │  Sentiment: Positive                     │        │
│ [At Risk]       │  ├──────────────────────────────────────────┤        │
│                 │  │  Sarah Jones - VP Ops (Supporter)        │        │
│                 │  │  ★★★☆☆ Influence: 6/10                   │        │
│                 │  │  Last contact: 12 days ago (email)       │        │
│                 │  │  Sentiment: Neutral                      │        │
│                 │  └──────────────────────────────────────────┘        │
│                 │                                                       │
│                 │  RECENT ACTIVITY                                      │
│                 │  ┌──────────────────────────────────────────┐        │
│                 │  │ ✉ Email - Product roadmap discussion     │        │
│                 │  │   Jan 2, 2026 - Sarah Jones              │        │
│                 │  ├──────────────────────────────────────────┤        │
│                 │  │ 📅 Meeting - Q1 Business Review          │        │
│                 │  │   Dec 30, 2025 - John Smith, Sarah       │        │
│                 │  │   Action Items: [3 open]                 │        │
│                 │  ├──────────────────────────────────────────┤        │
│                 │  │ 📝 Note - Expansion interest             │        │
│                 │  │   Dec 15, 2025 - Internal                │        │
│                 │  └──────────────────────────────────────────┘        │
│                 │                                                       │
│                 │  AI INSIGHTS                                          │
│                 │  ┌──────────────────────────────────────────┐        │
│                 │  │ 💡 No contact with Sarah in 12 days      │        │
│                 │  │    Suggested: Send follow-up email       │        │
│                 │  ├──────────────────────────────────────────┤        │
│                 │  │ 📊 Engagement up 25% this quarter        │        │
│                 │  │    Opportunity: Expansion conversation   │        │
│                 │  └──────────────────────────────────────────┘        │
│                 │                                                       │
└─────────────────┴──────────────────────────────────────────────────────┘
```

### Schedule Tab Wireframe (with Meeting Prep)

```
┌────────────────────────────────────────────────────────────────────────┐
│  SCHEDULE                                        [Today] [Week] [Month] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  WEDNESDAY, JAN 8, 2026                                                 │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 9:00 AM - 10:00 AM                                                │ │
│  │ ACME CORP - Q1 STRATEGY CALL                   [Prep Sheet] [Join]│ │
│  │ 📍 Zoom | 👥 John Smith, Sarah Jones                              │ │
│  │                                                                    │ │
│  │ ┌────────────────────────────────────────────────────────────┐   │ │
│  │ │ MEETING PREP SHEET                                          │   │ │
│  │ ├────────────────────────────────────────────────────────────┤   │ │
│  │ │ AGENDA                                                      │   │ │
│  │ │ 1. Q4 performance review (10 min)                           │   │ │
│  │ │ 2. Q1 goals and initiatives (20 min)                        │   │ │
│  │ │ 3. Budget discussion (15 min)                               │   │ │
│  │ │ 4. Next steps (5 min)                                       │   │ │
│  │ ├────────────────────────────────────────────────────────────┤   │ │
│  │ │ TALKING POINTS                                              │   │ │
│  │ │ • Q4 revenue: $2.3M (↑15% vs Q3)                            │   │ │
│  │ │ • New feature adoption: 78% of users                        │   │ │
│  │ │ • Expansion opportunity: 50 additional licenses             │   │ │
│  │ ├────────────────────────────────────────────────────────────┤   │ │
│  │ │ BACKGROUND (AI-Generated)                                   │   │ │
│  │ │ • Last meeting: Dec 30 (QBR - positive sentiment)           │   │ │
│  │ │ • Recent emails: Sarah asked about API roadmap              │   │ │
│  │ │ • Health score: 78/100 (stable)                             │   │ │
│  │ │ • Open action items from last meeting: 1                    │   │ │
│  │ ├────────────────────────────────────────────────────────────┤   │ │
│  │ │ OBJECTIVES                                                  │   │ │
│  │ │ ☐ Secure commitment for expansion licenses                 │   │ │
│  │ │ ☐ Address API roadmap concerns                             │   │ │
│  │ │ ☐ Schedule technical workshop for February                 │   │ │
│  │ └────────────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 2:00 PM - 3:00 PM                                                 │ │
│  │ INTERNAL - Team Sync                                              │ │
│  │ 📍 Conference Room A                                              │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 4:00 PM - 5:00 PM                                                 │ │
│  │ FOCUS TIME - Project Work                     [Protected]          │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. IMPLEMENTATION PHASES

### Phase 0: Code Cleanup & Preparation (Week 1)

**Objective**: Reduce technical debt before feature work

```
┌──────────────────────────────────────────────────────────────┐
│  PHASE 0: CLEANUP                                             │
├──────────────────────────────────────────────────────────────┤
│  Focus: Technical debt reduction, architectural simplification│
│  Duration: 1 week                                             │
│  Dependencies: None                                           │
└──────────────────────────────────────────────────────────────┘
```

**Tasks:**

- [ ] **Split googleAccountService.cjs** (3,100 lines → 3 files)
  - [ ] `gmailService.cjs` - Email sync, search, operations
  - [ ] `calendarService.cjs` - Event sync, CRUD operations
  - [ ] `contactsService.cjs` - Contact sync, import/export
  - [ ] Update all imports across codebase
  - [ ] Test each service independently

- [ ] **Extract IPC handlers from main.cjs** (133 handlers)
  - [ ] Create `electron/ipc/router.cjs` - Route registry pattern
  - [ ] Create `electron/ipc/handlers/` - Grouped by domain
    - [ ] `projectHandlers.cjs`
    - [ ] `emailHandlers.cjs`
    - [ ] `calendarHandlers.cjs`
    - [ ] `dgxHandlers.cjs`
    - [ ] `systemHandlers.cjs`
  - [ ] Update `main.cjs` to use router (< 50 lines)

- [ ] **Delete dead code**
  - [ ] Remove `Email-OLD-BACKUP.jsx` (2,262 lines)
  - [ ] Remove duplicate `parseGmailMessage()` function
  - [ ] Remove unused imports across codebase
  - [ ] Run ESLint cleanup pass

- [ ] **Standardize service architecture**
  - [ ] Create `BaseService` class with common patterns
  - [ ] Convert all services to extend BaseService
  - [ ] Add consistent error handling
  - [ ] Add logging to all service methods

**Acceptance Criteria:**
- All existing features work unchanged
- Build completes with no errors
- Code coverage maintained or improved
- Total LOC reduced by 15%+

---

### Phase 1: Database Schema Updates (Week 2)

**Objective**: Add CRM and scheduling tables

```
┌──────────────────────────────────────────────────────────────┐
│  PHASE 1: DATABASE SCHEMA                                     │
├──────────────────────────────────────────────────────────────┤
│  Focus: CRM tables, unified scheduling, account manager data  │
│  Duration: 1 week                                             │
│  Dependencies: Phase 0 complete                               │
└──────────────────────────────────────────────────────────────┘
```

**Tasks:**

- [ ] **Create CRM migrations**
  - [ ] `013_crm_contacts.cjs` - Enhanced contacts table
    ```sql
    ALTER TABLE contacts ADD COLUMN type TEXT DEFAULT 'person';
    ALTER TABLE contacts ADD COLUMN parent_id TEXT;
    ALTER TABLE contacts ADD COLUMN owner_id TEXT;
    ALTER TABLE contacts ADD COLUMN google_id TEXT;
    ```
  - [ ] `014_stakeholder_mapping.cjs` - Relationship tracking
    ```sql
    CREATE TABLE stakeholder_map (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      role TEXT,
      influence INTEGER,
      last_engagement TEXT,
      FOREIGN KEY (contact_id) REFERENCES contacts(id),
      FOREIGN KEY (account_id) REFERENCES contacts(id)
    );
    ```
  - [ ] `015_health_scores.cjs` - Account health analytics
    ```sql
    CREATE TABLE health_scores (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      score INTEGER,
      trend TEXT,
      risk_level TEXT,
      last_touch_days INTEGER,
      next_action TEXT,
      updated_at TEXT,
      FOREIGN KEY (account_id) REFERENCES contacts(id)
    );
    ```

- [ ] **Unified scheduling tables**
  - [ ] `016_unified_events.cjs` - Merge calendar + meetings
    ```sql
    ALTER TABLE calendar_events ADD COLUMN type TEXT DEFAULT 'meeting';
    ALTER TABLE calendar_events ADD COLUMN account_id TEXT;
    ALTER TABLE calendar_events ADD COLUMN attendees_json TEXT;
    ```
  - [ ] `017_prep_sheets.cjs` - Meeting preparation
    ```sql
    CREATE TABLE prep_sheets (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      agenda TEXT,
      talking_points TEXT,
      background TEXT,
      objectives TEXT,
      follow_ups TEXT,
      FOREIGN KEY (event_id) REFERENCES calendar_events(id)
    );
    ```
  - [ ] `018_transcripts.cjs` - Meeting intelligence
    ```sql
    CREATE TABLE meeting_transcripts (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      service TEXT,
      transcript_url TEXT,
      summary TEXT,
      action_items TEXT,
      sentiment TEXT,
      created_at TEXT,
      FOREIGN KEY (event_id) REFERENCES calendar_events(id)
    );
    ```

- [ ] **Run all migrations**
  - [ ] Test on development database
  - [ ] Create rollback scripts
  - [ ] Update database documentation

**Acceptance Criteria:**
- All migrations run cleanly
- No data loss from existing tables
- Foreign key constraints enforced
- Rollback scripts tested

---

### Phase 2: Relationships (CRM) Tab (Weeks 3-4)

**Objective**: Build unified CRM with Client 360 view

```
┌──────────────────────────────────────────────────────────────┐
│  PHASE 2: RELATIONSHIPS (CRM)                                 │
├──────────────────────────────────────────────────────────────┤
│  Focus: Contact management, stakeholder mapping, health scores│
│  Duration: 2 weeks                                            │
│  Dependencies: Phase 1 complete                               │
└──────────────────────────────────────────────────────────────┘
```

**Tasks:**

- [ ] **Contact list migration**
  - [ ] Merge `Contacts.jsx` into `Relationships.jsx`
  - [ ] Import Google contacts as read-only source
  - [ ] Add filter: [All] [Active] [At Risk]
  - [ ] Add sort: Name, Health Score, Last Contact
  - [ ] Add search: Company, name, email

- [ ] **Client 360 View component**
  - [ ] Create `components/relationships/Client360View.jsx`
  - [ ] Health score widget with trend indicator
  - [ ] Stakeholder map visualization
  - [ ] Recent activity timeline
  - [ ] AI insights panel

- [ ] **Stakeholder mapping**
  - [ ] Create `components/relationships/StakeholderMap.jsx`
  - [ ] Add/edit stakeholders with role, influence
  - [ ] Visual org chart (optional stretch goal)
  - [ ] Engagement tracking (last contact date)

- [ ] **Health scoring engine**
  - [ ] Create `services/healthScoringService.js`
  - [ ] Calculate score from:
    - Days since last contact (40%)
    - Email sentiment (30%)
    - Meeting frequency (20%)
    - Action item completion (10%)
  - [ ] Trend calculation (7-day, 30-day)
  - [ ] Risk level thresholds: High (<50), Medium (50-70), Low (>70)

- [ ] **AI insights**
  - [ ] Create `services/crmInsightsService.js`
  - [ ] Generate suggestions:
    - "No contact in X days - suggest follow-up"
    - "Engagement increasing - expansion opportunity"
    - "Sentiment declining - schedule check-in"
  - [ ] Use Claude API for natural language generation

**Acceptance Criteria:**
- All Google contacts visible in Relationships tab
- Health scores calculate correctly
- Client 360 view shows complete data
- AI insights update hourly
- Old Contacts tab disabled

---

### Phase 3: Schedule Tab (Weeks 5-6)

**Objective**: Merge Calendar + Meetings with prep sheets

```
┌──────────────────────────────────────────────────────────────┐
│  PHASE 3: SCHEDULE                                            │
├──────────────────────────────────────────────────────────────┤
│  Focus: Unified calendar, meeting prep, transcript integration│
│  Duration: 2 weeks                                            │
│  Dependencies: Phase 2 complete                               │
└──────────────────────────────────────────────────────────────┘
```

**Tasks:**

- [ ] **Unified event view**
  - [ ] Create `components/schedule/ScheduleView.jsx`
  - [ ] Merge CalendarView + Meetings components
  - [ ] Views: Day, Week, Month (reuse existing calendar logic)
  - [ ] Event types: Meeting, Focus Time, Deadline
  - [ ] Color coding by calendar/type

- [ ] **Meeting prep sheets**
  - [ ] Create `components/schedule/PrepSheet.jsx`
  - [ ] Auto-generate from:
    - Previous meeting notes
    - Recent email threads with attendees
    - Account health data
    - Open action items
  - [ ] Manual editing allowed
  - [ ] Save/load from `prep_sheets` table

- [ ] **AI prep sheet generation**
  - [ ] Create `services/prepSheetService.js`
  - [ ] Extract context:
    - Email threads (last 30 days)
    - Previous meeting notes
    - Account health/sentiment
  - [ ] Generate sections:
    - Agenda (from calendar description or AI)
    - Talking points (key topics)
    - Background (recent interactions)
    - Objectives (suggested goals)

- [ ] **Transcript integration** (Fireflies/Fathom)
  - [ ] Create `services/transcriptService.js`
  - [ ] Fireflies webhook handler
  - [ ] Fathom webhook handler
  - [ ] Extract: Summary, action items, sentiment
  - [ ] Link to calendar event
  - [ ] Display in Schedule view

- [ ] **Time blocking**
  - [ ] Add "Focus Time" event type
  - [ ] Quick actions: "Block 2 hours", "Protect time"
  - [ ] Auto-suggest based on project deadlines

**Acceptance Criteria:**
- All calendar events from Google sync
- Prep sheets generate for upcoming meetings
- Transcripts link to events correctly
- Old Calendar and Meetings tabs disabled

---

### Phase 4: Chat Integration (Week 7)

**Objective**: Move Memory Lane and Reminders into Chat

```
┌──────────────────────────────────────────────────────────────┐
│  PHASE 4: CHAT INTEGRATION                                    │
├──────────────────────────────────────────────────────────────┤
│  Focus: Memory Lane sidebar, Reminders panel, context-aware AI│
│  Duration: 1 week                                             │
│  Dependencies: Phase 3 complete                               │
└──────────────────────────────────────────────────────────────┘
```

**Tasks:**

- [ ] **Chat layout redesign**
  - [ ] Update `components/chat/ChatApp.jsx`
  - [ ] 3-column layout:
    - Left: Memory Lane (collapsible)
    - Center: Chat messages
    - Right: Reminders panel (collapsible)
  - [ ] Responsive: Collapse sidebars on narrow screens

- [ ] **Memory Lane sidebar**
  - [ ] Move `MemoryViewer.jsx` into `components/chat/MemoryLaneSidebar.jsx`
  - [ ] Compact view: Recent snapshots only
  - [ ] Click to expand full history
  - [ ] Link to current chat context

- [ ] **Reminders panel**
  - [ ] Create `components/chat/RemindersPanel.jsx`
  - [ ] Show upcoming reminders (next 7 days)
  - [ ] Quick actions: Snooze, Complete, Add
  - [ ] Notification badge on Chat tab

- [ ] **Context-aware chat**
  - [ ] Include Memory Lane context in AI prompts
  - [ ] Reference recent reminders
  - [ ] Link to relevant projects/contacts

**Acceptance Criteria:**
- Memory Lane accessible from Chat sidebar
- Reminders visible in Chat panel
- Old Memory Lane tab disabled
- Old Reminders tab disabled

---

### Phase 5: Settings Consolidation (Week 8)

**Objective**: Merge Admin + Accounts + DGX + Terminal

```
┌──────────────────────────────────────────────────────────────┐
│  PHASE 5: SETTINGS                                            │
├──────────────────────────────────────────────────────────────┤
│  Focus: Single settings hub, multi-section navigation         │
│  Duration: 1 week                                             │
│  Dependencies: Phase 4 complete                               │
└──────────────────────────────────────────────────────────────┘
```

**Tasks:**

- [ ] **Settings navigation**
  - [ ] Create `components/settings/SettingsNav.jsx`
  - [ ] Sections:
    - Accounts (Google OAuth)
    - Preferences (Theme, notifications)
    - DGX Spark (GPU servers)
    - Terminal (Embedded shell)
    - Advanced (API keys, database)

- [ ] **Merge existing components**
  - [ ] Move `Accounts.jsx` → `settings/AccountsSection.jsx`
  - [ ] Move `Admin.jsx` panels → `settings/AdvancedSection.jsx`
  - [ ] Move `DGXSpark.jsx` → `settings/DGXSection.jsx`
  - [ ] Move `Terminal.jsx` → `settings/TerminalSection.jsx`

- [ ] **Unified settings layout**
  - [ ] Left sidebar: Section navigation
  - [ ] Right panel: Active section content
  - [ ] Save state to localStorage

**Acceptance Criteria:**
- All admin features accessible in Settings
- DGX Spark works from Settings
- Terminal embedded in Settings
- Old Admin, Accounts tabs disabled

---

### Phase 6: Pipeline & Opportunities (Week 9-10)

**Objective**: Add sales pipeline tracking to CRM

```
┌──────────────────────────────────────────────────────────────┐
│  PHASE 6: PIPELINE                                            │
├──────────────────────────────────────────────────────────────┤
│  Focus: Opportunity tracking, revenue forecasting, QBR reports│
│  Duration: 2 weeks                                            │
│  Dependencies: Phase 2 complete                               │
└──────────────────────────────────────────────────────────────┘
```

**Tasks:**

- [ ] **Pipeline database**
  - [ ] Migration: `019_opportunities.cjs`
    ```sql
    CREATE TABLE opportunities (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      name TEXT,
      stage TEXT,
      value REAL,
      close_date TEXT,
      probability INTEGER,
      owner_id TEXT,
      FOREIGN KEY (account_id) REFERENCES contacts(id)
    );
    ```

- [ ] **Pipeline view**
  - [ ] Create `components/relationships/PipelineView.jsx`
  - [ ] Kanban board: Prospect → Qualified → Proposal → Negotiation → Closed
  - [ ] Drag-and-drop stage changes
  - [ ] Filter by owner, date range, value

- [ ] **Revenue forecasting**
  - [ ] Create `services/forecastService.js`
  - [ ] Calculate: value × probability
  - [ ] Aggregated by month, quarter
  - [ ] Trend visualization

- [ ] **QBR/EBR report generation**
  - [ ] Create `components/relationships/ReportGenerator.jsx`
  - [ ] Template: Quarterly Business Review
  - [ ] Auto-populate:
    - Health score trends
    - Recent activity
    - Revenue metrics
    - Action items
  - [ ] Export to PDF

**Acceptance Criteria:**
- Pipeline visible in Relationships tab
- Forecasts calculate correctly
- QBR reports generate with real data

---

### Phase 7: AI Email Assistance (Week 11-12)

**Objective**: Smart compose, templates, sentiment analysis

```
┌──────────────────────────────────────────────────────────────┐
│  PHASE 7: AI EMAIL                                            │
├──────────────────────────────────────────────────────────────┤
│  Focus: Email templates, sentiment analysis, smart replies    │
│  Duration: 2 weeks                                            │
│  Dependencies: Phase 2 complete                               │
└──────────────────────────────────────────────────────────────┘
```

**Tasks:**

- [ ] **Email templates**
  - [ ] Create `components/email/TemplateManager.jsx`
  - [ ] Templates:
    - Follow-up after meeting
    - Check-in email
    - Introduction
    - Escalation
  - [ ] Variable replacement: {{contact.name}}, {{account.name}}

- [ ] **Sentiment analysis**
  - [ ] Create `services/sentimentService.js`
  - [ ] Analyze incoming emails with Claude API
  - [ ] Score: Positive, Neutral, Negative
  - [ ] Store in `interactions` table
  - [ ] Show indicator in email list

- [ ] **Smart compose**
  - [ ] Create `components/email/SmartCompose.jsx`
  - [ ] AI-generated drafts based on:
    - Template selection
    - Account context
    - Recent interactions
  - [ ] User can edit before sending

- [ ] **Auto-link to CRM**
  - [ ] Detect contacts in email threads
  - [ ] Create interactions automatically
  - [ ] Link emails to accounts
  - [ ] Extract action items

**Acceptance Criteria:**
- Templates insert correctly
- Sentiment scores accurate
- Smart compose generates relevant drafts
- Emails link to CRM contacts

---

### Phase 8: Testing & Polish (Week 13-14)

**Objective**: End-to-end testing, performance optimization

```
┌──────────────────────────────────────────────────────────────┐
│  PHASE 8: TESTING & POLISH                                    │
├──────────────────────────────────────────────────────────────┤
│  Focus: Integration testing, performance, documentation       │
│  Duration: 2 weeks                                            │
│  Dependencies: All phases complete                            │
└──────────────────────────────────────────────────────────────┘
```

**Tasks:**

- [ ] **Integration testing**
  - [ ] Test Google sync workflows
  - [ ] Test CRM → Email → Schedule flow
  - [ ] Test AI features end-to-end
  - [ ] Test all IPC handlers

- [ ] **Performance optimization**
  - [ ] Profile database queries
  - [ ] Add indexes to frequently queried columns
  - [ ] Lazy load components
  - [ ] Debounce AI calls

- [ ] **Documentation**
  - [ ] Update CLAUDE.md with new structure
  - [ ] Create user guide for Account Manager features
  - [ ] Update API documentation
  - [ ] Create video walkthrough

- [ ] **Remove old tabs**
  - [ ] Delete `Contacts.jsx`, `Meetings.jsx`, `CalendarView.jsx`
  - [ ] Delete `MemoryViewer.jsx` (standalone)
  - [ ] Delete `Reminders.jsx` (standalone)
  - [ ] Delete `Admin.jsx`, `Accounts.jsx`
  - [ ] Update Sidebar.jsx to remove old entries

**Acceptance Criteria:**
- All tests pass
- Load time < 2s
- Documentation complete
- Old code removed

---

## 6. MIGRATION CHECKLIST

### User Data Migration (Zero Data Loss)

- [ ] **Contacts**
  - [ ] Merge `contacts` + `account_contacts` → unified `contacts`
  - [ ] Preserve Google sync metadata
  - [ ] Link to existing `interactions`

- [ ] **Events**
  - [ ] Merge `calendar_events` + `meetings` → unified `events`
  - [ ] Preserve Google Calendar IDs
  - [ ] Migrate meeting notes to prep sheets

- [ ] **Settings**
  - [ ] Preserve all preferences
  - [ ] Migrate OAuth tokens
  - [ ] Copy theme settings

### Component Removal Strategy

```
┌────────────────────────────────────────────────────────────┐
│  COMPONENT LIFECYCLE                                        │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Phase 1-7: Old tabs DISABLED but not deleted              │
│  └─ Set visible: false in Sidebar.jsx                      │
│  └─ Add deprecation notice in component                    │
│                                                             │
│  Phase 8: Old tabs DELETED after testing                   │
│  └─ Remove from APPS in App.jsx                            │
│  └─ Delete component files                                 │
│  └─ Remove imports                                          │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## 7. RISKS & MITIGATIONS

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Data loss during merge | High | Low | Migration scripts with rollback |
| Google sync breaks | High | Medium | Keep old services until Phase 8 |
| User confusion with new layout | Medium | High | In-app tutorial, changelog |
| Performance degradation | Medium | Medium | Profile early, optimize Phase 8 |
| IPC handler refactor breaks features | High | Medium | Incremental migration, automated tests |
| AI costs increase | Low | High | Implement rate limiting, caching |

---

## 8. SUCCESS METRICS

### Quantitative Goals

| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| Number of tabs | 17 | 10 | Sidebar item count |
| LOC (total) | ~35,000 | <30,000 | cloc output |
| IPC handlers in main.cjs | 133 | <50 | Line count |
| googleAccountService.cjs | 3,100 lines | <1,000 | Split into 3 files |
| Database tables | 25 | 30 | Migration count |
| Load time | ~3s | <2s | Performance.now() |
| Memory usage | ~250MB | <200MB | Task Manager |

### Qualitative Goals

- [ ] Users can find features intuitively
- [ ] Account Manager workflow feels cohesive
- [ ] AI features provide clear value
- [ ] Settings are easy to configure
- [ ] Navigation is faster

---

## 9. ROLLOUT PLAN

### Beta Testing (Week 13)

1. **Internal dogfooding**
   - Use revamped app for real work
   - Log issues in GitHub
   - Iterate on feedback

2. **Feature flags**
   - Enable old tabs via settings toggle
   - Gradual rollout of new features
   - A/B test AI suggestions

### Launch (Week 14)

1. **Announcement**
   - Changelog document
   - Video walkthrough
   - Migration guide

2. **Support**
   - FAQ document
   - Known issues tracker
   - Rollback procedure

---

## 10. APPENDIX: DETAILED WIREFRAMES

### Settings Multi-Section Layout

```
┌────────────────────────────────────────────────────────────────────┐
│  SETTINGS                                                           │
├───────────────┬────────────────────────────────────────────────────┤
│               │                                                     │
│  SECTIONS     │  ACCOUNTS                                           │
│               │                                                     │
│ > Accounts    │  ┌──────────────────────────────────────────────┐  │
│   Preferences │  │  Google Account                               │  │
│   DGX Spark   │  │  ✓ Connected: husky2466@gmail.com             │  │
│   Terminal    │  │  [Disconnect] [Refresh Token]                 │  │
│   Advanced    │  └──────────────────────────────────────────────┘  │
│               │                                                     │
│               │  SERVICES                                           │
│               │  ┌──────────────────────────────────────────────┐  │
│               │  │ ☑ Gmail       Last sync: 2 min ago            │  │
│               │  │ ☑ Calendar    Last sync: 5 min ago            │  │
│               │  │ ☑ Contacts    Last sync: 1 hour ago           │  │
│               │  └──────────────────────────────────────────────┘  │
│               │                                                     │
│               │  INTEGRATIONS                                       │
│               │  ┌──────────────────────────────────────────────┐  │
│               │  │ Fireflies  [Connect]                          │  │
│               │  │ Fathom     [Connect]                          │  │
│               │  └──────────────────────────────────────────────┘  │
│               │                                                     │
└───────────────┴────────────────────────────────────────────────────┘
```

### Chat with Sidebars

```
┌────────────────────────────────────────────────────────────────────┐
│  CHAT                                     [Memory] [Reminders (3)] │
├──────────┬──────────────────────────────────────┬──────────────────┤
│          │                                       │                  │
│ MEMORY   │  CONVERSATION                         │  REMINDERS       │
│ LANE     │                                       │                  │
│          │  ┌────────────────────────────────┐  │  ☐ Follow up     │
│ Recent   │  │ You: What's on my schedule    │  │    with Acme     │
│ Snapshots│  │      today?                   │  │    (Today 2pm)   │
│          │  └────────────────────────────────┘  │                  │
│ 2:30 PM  │  ┌────────────────────────────────┐  │  ☐ QBR prep for  │
│ CLAUDE.md│  │ AI: You have 2 meetings:       │  │    TechStart     │
│ updated  │  │  • 9am: Acme Q1 Strategy       │  │    (Tomorrow)    │
│          │  │  • 2pm: Team Sync              │  │                  │
│ 11:15 AM │  └────────────────────────────────┘  │  ☐ Send proposal │
│ New task │                                       │    to GlobalCo   │
│ added    │  ┌────────────────────────────────┐  │    (Jan 8)       │
│          │  │ You: Show me Acme prep sheet   │  │                  │
│ [View    │  └────────────────────────────────┘  │  [+ New]         │
│  All]    │  ┌────────────────────────────────┐  │                  │
│          │  │ AI: [Prep sheet loaded]        │  │                  │
│          │  │  Agenda: Q4 review, Q1 goals   │  │                  │
│          │  │  Talking points: Revenue up... │  │                  │
│          │  └────────────────────────────────┘  │                  │
│          │                                       │                  │
│ [<]      │  [Type a message...]                 │  [>]             │
│          │                                       │                  │
└──────────┴──────────────────────────────────────┴──────────────────┘
```

---

## 11. NEXT STEPS

### Immediate Actions (This Week)

1. **Review Plan**: Stakeholder approval on consolidation strategy
2. **Phase 0 Kickoff**: Start code cleanup (split googleAccountService.cjs)
3. **Database Design Review**: Validate CRM schema with data team
4. **Create GitHub Project**: Track all tasks with milestones

### Decision Points

- [ ] Approve tab consolidation (17 → 10)
- [ ] Approve CRM feature set
- [ ] Approve 14-week timeline
- [ ] Approve risk mitigation strategy

### Open Questions

1. Which meeting transcript service to integrate first: Fireflies or Fathom?
2. Should health scoring be customizable per user?
3. Do we need to support multiple account managers (multi-user)?
4. What level of AI automation is acceptable without user confirmation?

---

**END OF REVAMP PLAN**

*For questions or clarifications, reference individual phase specs or create GitHub issue.*
