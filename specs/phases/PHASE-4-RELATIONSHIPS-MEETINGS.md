# Phase 4: Relationships & Meetings

**Status**: Not Started
**Timeline**: Weeks 10-11
**Priority**: P1 (High)
**Estimated Effort**: 10 days

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) | [04-RELATIONSHIPS.md](../components/04-RELATIONSHIPS.md) | [05-MEETINGS.md](../components/05-MEETINGS.md)

---

## Design Review Checkpoint

### Relationships Design Requirements
- [ ] Module accent: Pink `--module-relationships` (#ec4899)
- [ ] Uses Network icon for branding (part of brain/eye/network trinity)
- [ ] Freshness indicators use correct colors/icons:
  - Hot: `--freshness-hot` (#ef4444) + fire icon
  - Warm: `--freshness-warm` (#f59e0b) + sun icon
  - Cool: `--freshness-cool` (#3b82f6) + cloud icon
  - Cold: `--freshness-cold` (#6b7280) + snowflake icon
- [ ] Contact avatars display initials on colored background
- [ ] Master-detail layout responsive

### Meetings Design Requirements
- [ ] Module accent: Blue `--module-meetings` (#3b82f6)
- [ ] Participant avatars show freshness from contacts
- [ ] Prep sheet sections clearly differentiated
- [ ] Markdown notes render with correct styling

### End of Phase 4 Design Checklist
- [ ] Freshness indicators display correctly throughout
- [ ] Interaction timeline is scannable
- [ ] Prep sheet auto-generated content is readable
- [ ] Commitment badges use `--status-warning` (#f59e0b)
- [ ] No hardcoded colors in Relationships or Meetings CSS
- [ ] Dashboard widgets match parent module colors

---

## Overview

Phase 4 builds the communication layer: Relationships (CRM with freshness tracking) and Meetings (with auto-generated prep sheets). These modules work together - meeting attendees link to contacts, prep sheets pull from relationship context.

## Objectives

1. Build Relationships CRM with freshness system
2. Create contact groups and interactions
3. Build Meetings system with prep sheets
4. Implement commitment extraction
5. Link meetings to contacts
6. Create dashboard widgets for both

## Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 4 DEPENDENCIES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  From Phase 1:                                                  │
│  • SQLite with contacts, meetings tables                       │
│  • Card, Modal, MarkdownEditor components                      │
│  • Theme and navigation                                        │
│                                                                 │
│  From Phase 3:                                                  │
│  • ReminderService for commitment -> reminder                  │
│  • ProjectService for commitment -> task                       │
│                                                                 │
│  External Dependencies:                                         │
│  • Claude API (for prep sheet generation, commitment extraction)│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Detailed Task Checklist

### Week 10: Relationships (CRM)

#### CRM Structure (Day 1)
- [ ] Create `src/components/relationships/` directory
- [ ] Create `src/components/relationships/RelationshipsApp.jsx`
  - [ ] Two-panel layout (list + detail)
  - [ ] State for selected contact
- [ ] Create `src/components/relationships/RelationshipsApp.css`
- [ ] Create `src/utils/freshness.js`
  ```javascript
  export function calculateFreshness(lastContactDate) {
    const daysSince = daysBetween(lastContactDate, new Date());
    if (daysSince <= 7) return { label: 'Hot', color: '#ef4444', icon: 'fire' };
    if (daysSince <= 30) return { label: 'Warm', color: '#f59e0b', icon: 'sun' };
    if (daysSince <= 90) return { label: 'Cool', color: '#3b82f6', icon: 'cloud' };
    return { label: 'Cold', color: '#6b7280', icon: 'snowflake' };
  }
  ```

#### Contact List (Days 1-2)
- [ ] Create `src/components/relationships/ContactList.jsx`
  - [ ] Search input with instant filtering
  - [ ] Sort dropdown: Name, Last Contact, Priority
  - [ ] Scrollable list
- [ ] Create `src/components/relationships/ContactListItem.jsx`
  - [ ] Avatar/initials
  - [ ] Name, company
  - [ ] Freshness indicator (emoji/color)
  - [ ] Priority badge
- [ ] Create `src/components/relationships/GroupFilter.jsx`
  - [ ] Collapsible group list
  - [ ] Click to filter

#### Contact Detail (Days 2-3)
- [ ] Create `src/components/relationships/ContactDetail.jsx`
  - [ ] Header with name, freshness, priority
  - [ ] Last contact date
  - [ ] Tabbed or scrolling sections
- [ ] Create `src/components/relationships/ContactInfo.jsx`
  - [ ] Email, company, title, location
  - [ ] Social links (Twitter, LinkedIn, GitHub)
- [ ] Create `src/components/relationships/ContactContext.jsx`
  - [ ] Editable context/notes
  - [ ] Professional background
- [ ] Create `src/components/relationships/ContactInteractions.jsx`
  - [ ] Interaction timeline
  - [ ] Add interaction button
- [ ] Create `src/components/relationships/ContactLinks.jsx`
  - [ ] Related projects, meetings, knowledge

#### Contact Modal & Groups (Day 4)
- [ ] Create `src/components/relationships/ContactModal.jsx`
  - [ ] All contact fields
  - [ ] Group multi-select
  - [ ] Slug auto-generation
- [ ] Create `src/components/relationships/GroupModal.jsx`
  - [ ] Group name, description
- [ ] Create `src/components/relationships/LogInteractionModal.jsx`
  - [ ] Type: Email, Meeting, Call, Message, In-Person
  - [ ] Summary textarea
  - [ ] Date picker

#### Relationship Service (Day 5)
- [ ] Create `src/services/RelationshipService.js`
  - [ ] CRUD for contacts and groups
  - [ ] `getContactsByFreshness()` - Sort by staleness
  - [ ] `getStaleContacts(threshold)` - Cold contacts
  - [ ] `logInteraction(contactId, type, summary)`
  - [ ] `getContactInteractions(contactId)`
  - [ ] `searchContacts(query)`
  - [ ] `getContactsByGroup(groupId)`

### Week 11: Meetings

#### Meetings Structure (Day 6)
- [ ] Create `src/components/meetings/` directory
- [ ] Create `src/components/meetings/MeetingsApp.jsx`
  - [ ] Two-panel layout
  - [ ] State for selected meeting
- [ ] Create `src/components/meetings/MeetingsApp.css`

#### Meeting List (Day 6)
- [ ] Create `src/components/meetings/MeetingList.jsx`
  - [ ] Search input
  - [ ] Group by: Today, Yesterday, This Week, Earlier
  - [ ] Filter tabs: All, Upcoming, Past
- [ ] Create `src/components/meetings/MeetingListItem.jsx`
  - [ ] Title, date/time
  - [ ] Participant count
  - [ ] Status indicator

#### Meeting Detail (Days 7-8)
- [ ] Create `src/components/meetings/MeetingDetail.jsx`
  - [ ] Header with title, date, time, location
  - [ ] Participants list
  - [ ] Sections: Prep, Notes, Commitments
- [ ] Create `src/components/meetings/ParticipantList.jsx`
  - [ ] Show linked contacts with freshness
  - [ ] Add participant button
  - [ ] Click to navigate to contact
- [ ] Create `src/components/meetings/PrepSheet.jsx`
  - [ ] Auto-generated attendee context
  - [ ] Last interaction per attendee
  - [ ] Talking points input
- [ ] Create `src/components/meetings/AttendeeContext.jsx`
  - [ ] Pull from contact context/background
  - [ ] Show last interaction

#### Notes & Commitments (Days 8-9)
- [ ] Create `src/components/meetings/PreMeetingChecklist.jsx`
  - [ ] Default checklist items
  - [ ] Custom items per meeting
- [ ] Create `src/components/meetings/PostMeetingNotes.jsx`
  - [ ] Markdown editor for notes
  - [ ] Template sections
  - [ ] Auto-save
- [ ] Create `src/components/meetings/CommitmentExtractor.jsx`
  - [ ] "Extract Commitments" button
  - [ ] AI parses notes for action items
  - [ ] Display for review
  - [ ] Convert to Reminder or Task

#### Meeting Modal & Service (Day 9)
- [ ] Create `src/components/meetings/MeetingModal.jsx`
  - [ ] Title, description
  - [ ] Date/time picker
  - [ ] Duration dropdown
  - [ ] Location
  - [ ] Participant search/add
- [ ] Create `src/services/MeetingService.js`
  - [ ] CRUD for meetings
  - [ ] `addParticipant(meetingId, contactId)`
  - [ ] `removeParticipant(meetingId, contactId)`
  - [ ] `generatePrepSheet(meetingId)` - AI generation
  - [ ] `extractCommitments(meetingId, notes)` - AI extraction
  - [ ] `getUpcoming()`, `getPast()`

#### Dashboard Widgets (Day 10)
- [ ] Create `src/components/dashboard/widgets/RelationshipsWidget.jsx`
  - [ ] Warning count (stale relationships)
  - [ ] Top needs-attention contacts
  - [ ] Patterns detected
- [ ] Create `src/components/dashboard/widgets/ScheduleWidget.jsx`
  - [ ] Today's meetings timeline
  - [ ] Current time indicator
- [ ] Connect to services

## Deliverables

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 4 DELIVERABLES                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Relationships (CRM)                                            │
│  ├─ Contact list with search and sort                          │
│  ├─ Freshness indicators (Hot/Warm/Cool/Cold)                  │
│  ├─ Contact detail with context and history                    │
│  ├─ Interaction logging                                        │
│  ├─ Groups and filtering                                       │
│  └─ Link to projects, meetings, knowledge                      │
│                                                                 │
│  Meetings                                                       │
│  ├─ Meeting list with date grouping                            │
│  ├─ Meeting detail with participants                           │
│  ├─ Auto-generated prep sheets                                 │
│  ├─ Pre-meeting checklist                                      │
│  ├─ Post-meeting notes with markdown                           │
│  └─ Commitment extraction -> reminders/tasks                   │
│                                                                 │
│  Dashboard Widgets                                              │
│  ├─ Relationships widget (stale contacts)                      │
│  └─ Schedule widget (today's meetings)                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Prep sheet generation slow | Medium | Low | Use Claude Haiku, cache |
| Commitment extraction inaccurate | Medium | Medium | Human review before creating |
| Too many stale contacts | Low | Low | Configurable thresholds |

## Success Criteria

- [ ] Can create, edit, and delete contacts
- [ ] Freshness calculates correctly
- [ ] Interaction logging updates last_contact_at
- [ ] Groups filter contact list
- [ ] Can create and manage meetings
- [ ] Participants link to contacts
- [ ] Prep sheet generates with attendee context
- [ ] Notes save with markdown
- [ ] Commitments extract and convert to reminders/tasks
- [ ] Dashboard widgets show correct data

## Files Created/Modified

### New Files (~25)
```
src/components/relationships/RelationshipsApp.jsx
src/components/relationships/RelationshipsApp.css
src/components/relationships/ContactList.jsx
src/components/relationships/ContactListItem.jsx
src/components/relationships/ContactDetail.jsx
src/components/relationships/ContactInfo.jsx
src/components/relationships/ContactContext.jsx
src/components/relationships/ContactInteractions.jsx
src/components/relationships/ContactLinks.jsx
src/components/relationships/ContactModal.jsx
src/components/relationships/GroupFilter.jsx
src/components/relationships/GroupModal.jsx
src/components/relationships/LogInteractionModal.jsx
src/services/RelationshipService.js
src/utils/freshness.js
src/components/meetings/MeetingsApp.jsx
src/components/meetings/MeetingsApp.css
src/components/meetings/MeetingList.jsx
src/components/meetings/MeetingListItem.jsx
src/components/meetings/MeetingDetail.jsx
src/components/meetings/ParticipantList.jsx
src/components/meetings/PrepSheet.jsx
src/components/meetings/AttendeeContext.jsx
src/components/meetings/PreMeetingChecklist.jsx
src/components/meetings/PostMeetingNotes.jsx
src/components/meetings/CommitmentExtractor.jsx
src/components/meetings/MeetingModal.jsx
src/services/MeetingService.js
src/components/dashboard/widgets/RelationshipsWidget.jsx
src/components/dashboard/widgets/ScheduleWidget.jsx
```

### Modified Files (~2)
```
src/App.jsx - Add Relationships and Meetings routes
```

## Agent Assignment

- Primary: `electron-react-dev`

---
**Notes**: Relationships and Meetings are about "showing up for people better." The freshness system creates gentle accountability. Prep sheets are the wow factor - walking into meetings with context makes a huge difference.
