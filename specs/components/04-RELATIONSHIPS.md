# Relationships (CRM)

**Status**: Not Started
**Priority**: P1 (High)
**Estimated Effort**: 6 days
**Dependencies**:
- `specs/features/DATABASE-LAYER.md` - SQLite setup required
- `specs/features/SHARED-COMPONENTS.md` - Card, Modal components
- `specs/components/00-CSS-VARIABLES.md` - Design tokens (required)

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) | [00-CSS-VARIABLES.md](00-CSS-VARIABLES.md)

---

## Design Guidelines

### Module Identity
- **Primary Accent**: Pink `--module-relationships` (#ec4899)
- **Visual Symbol**: Network icon (part of brain/eye/network trinity)
- **Visual Theme**: Personal CRM, freshness indicators, relationship depth

### Color Usage
| Element | Variable | Hex |
|---------|----------|-----|
| Module accent | `--module-relationships` | #ec4899 |
| Card backgrounds | `--bg-card` | #2d2d4a |
| Priority high | `--status-error` | #ef4444 |
| Social links | Brand colors | Various |

### Freshness Indicator Colors (Critical)
| Status | Variable | Hex | Icon | Days Since |
|--------|----------|-----|------|------------|
| Hot | `--freshness-hot` | #ef4444 | fire | 0-7 days |
| Warm | `--freshness-warm` | #f59e0b | sun | 8-30 days |
| Cool | `--freshness-cool` | #3b82f6 | cloud | 31-90 days |
| Cold | `--freshness-cold` | #6b7280 | snowflake | 90+ days |

### Icon Style
- Line art, 2px stroke weight
- Contact icons: user, users, mail, phone, building
- Freshness icons: flame, sun, cloud, snowflake
- Social icons: twitter, linkedin, github (brand style)

### Layout Pattern - Master/Detail
```
+------------------+--------------------------------+
| CONTACT LIST     | CONTACT DETAIL                 |
|                  |                                |
| [Search...]      | John Smith  [Hot]              |
|                  | CEO at TechCorp                |
| Groups:          | Last contact: 2 days ago       |
| [x] All Contacts +--------------------------------+
| [ ] Team         | [Info] [Context] [History]     |
| [ ] Clients      +--------------------------------+
| [ ] Mentors      | Professional background...     |
|                  | Context notes...               |
| Contacts:        |                                |
| [Hot] John Smith +--------------------------------+
| [Warm] Jane Doe  | INTERACTIONS                   |
| [Cold] Bob Lee   | - Email (2 days ago)           |
|                  | - Meeting (1 week ago)         |
+------------------+--------------------------------+
```

### Component Specifics
- **Contact List Items**: Avatar/initials, name, freshness icon
- **Freshness Badge**: Colored circle with icon
- **Detail Header**: Large name, freshness status, priority
- **Interaction Timeline**: Chronological with type icons
- **Social Links**: Brand-colored icons in row

### Design Checklist
- [ ] Background uses `--bg-primary` (#1a1a2e)
- [ ] Freshness indicators use correct colors/icons
- [ ] Master-detail layout responsive
- [ ] Contact avatars or initials displayed
- [ ] Interaction timeline is scannable
- [ ] Pink accent for module highlights

---

## Overview

The Relationships module is a personal CRM focused on depth over sales. It tracks contacts with professional context, interaction history, and "freshness" - how recently you've been in touch. The system surfaces stale relationships before they go cold and links contacts to projects, meetings, and knowledge.

## Acceptance Criteria

- [ ] Contact list with search and sort (by name, last contact, priority)
- [ ] Freshness indicators: Hot (7 days), Warm (30 days), Cool (90 days), Cold (90+ days)
- [ ] Contact detail view with: info, context, social links, interaction history
- [ ] Groups/tags for organizing contacts (Team, Clients, Mentors, etc.)
- [ ] Log interactions: email, meeting, call, message, in-person
- [ ] Dashboard widget showing stale relationships needing attention
- [ ] Link contacts to projects, meetings, knowledge articles
- [ ] Import from CSV/vCard (optional)

## Tasks

### Section 1: Component Structure
- [ ] Create `src/components/relationships/` directory
  - [ ] Create `RelationshipsApp.jsx` - Main container (master-detail layout)
  - [ ] Create `RelationshipsApp.css` - CRM-specific styles
- [ ] Implement two-panel layout (list + detail)

### Section 2: Contact List Panel
- [ ] Create `ContactList.jsx`
  - [ ] Search input with instant filtering
  - [ ] Sort dropdown: Name, Last Contact, Priority
  - [ ] Contact items with freshness indicator
- [ ] Create `ContactListItem.jsx`
  - [ ] Avatar/initials, name, company
  - [ ] Freshness emoji (fire, sun, cloud, snowflake)
  - [ ] Priority badge (if high)
- [ ] Create `GroupFilter.jsx`
  - [ ] Collapsible group list
  - [ ] Click to filter by group
  - [ ] "All Contacts" option

### Section 3: Contact Detail Panel
- [ ] Create `ContactDetail.jsx`
  - [ ] Header with name, freshness badge, priority
  - [ ] Last contact date display
  - [ ] Tabbed sections or scroll layout
- [ ] Create detail sections:
  - [ ] `ContactInfo.jsx` - Email, company, title, location, social links
  - [ ] `ContactContext.jsx` - Editable context/notes about relationship
  - [ ] `ContactInteractions.jsx` - Interaction history timeline
  - [ ] `ContactLinks.jsx` - Related projects, meetings, knowledge

### Section 4: Contact Modal (Create/Edit)
- [ ] Create `ContactModal.jsx`
  - [ ] Name (required), slug (auto-generated)
  - [ ] Email, company, title, location
  - [ ] Priority dropdown (high, medium, low)
  - [ ] Context textarea
  - [ ] Professional background textarea
  - [ ] Social links (Twitter, LinkedIn, GitHub)
  - [ ] Group multi-select
- [ ] Implement slug generation from name
- [ ] Validate required fields

### Section 5: Group Management
- [ ] Create `GroupModal.jsx`
  - [ ] Group name, description
- [ ] Create `GroupManager.jsx`
  - [ ] List all groups with edit/delete
  - [ ] Drag contacts into groups
- [ ] Implement many-to-many relationship

### Section 6: Interaction Logging
- [ ] Create `LogInteractionModal.jsx`
  - [ ] Type selector: Email, Meeting, Call, Message, In-Person
  - [ ] Summary textarea
  - [ ] Date picker (default: now)
- [ ] Create `InteractionTimeline.jsx`
  - [ ] Chronological list of interactions
  - [ ] Type icons, date, summary preview
  - [ ] Click to expand full summary
- [ ] Auto-update last_contact_at on new interaction

### Section 7: Freshness System
- [ ] Create `src/utils/freshness.js`
  ```javascript
  function calculateFreshness(lastContactDate) {
    const daysSince = daysBetween(lastContactDate, new Date());
    if (daysSince <= 7) return { label: 'Hot', color: '#ef4444', icon: 'fire' };
    if (daysSince <= 30) return { label: 'Warm', color: '#f59e0b', icon: 'sun' };
    if (daysSince <= 90) return { label: 'Cool', color: '#3b82f6', icon: 'cloud' };
    return { label: 'Cold', color: '#6b7280', icon: 'snowflake' };
  }
  ```
- [ ] Display freshness in list items and detail header
- [ ] Color-code appropriately

### Section 8: Relationship Service
- [ ] Create `src/services/RelationshipService.js`
  - [ ] CRUD for contacts and groups
  - [ ] `getContactsByFreshness()` - Sort by staleness
  - [ ] `getStaleContacts(threshold)` - Get cold contacts
  - [ ] `logInteraction(contactId, type, summary)` - Add interaction
  - [ ] `getContactInteractions(contactId)` - Get history
  - [ ] `searchContacts(query)` - Full-text search
  - [ ] `getContactsByGroup(groupId)` - Filter by group

### Section 9: Entity Linking
- [ ] Implement linking UI in ContactLinks section
  - [ ] Search for projects, meetings, knowledge to link
  - [ ] Display linked items with navigation
- [ ] Create link tables/columns as needed
- [ ] Navigate to linked items on click

### Section 10: Dashboard Integration
- [ ] Create `getRelationshipsWidgetData()` method
  - [ ] Return count of stale contacts
  - [ ] Return top 5 needs-attention contacts
  - [ ] Return any detected patterns ("less outreach this month")
- [ ] Feed data to Dashboard widget

## Technical Details

### Files to Create
- `src/components/relationships/RelationshipsApp.jsx` - Main container
- `src/components/relationships/RelationshipsApp.css` - Styles
- `src/components/relationships/ContactList.jsx` - List panel
- `src/components/relationships/ContactListItem.jsx` - List item
- `src/components/relationships/ContactDetail.jsx` - Detail panel
- `src/components/relationships/ContactInfo.jsx` - Info section
- `src/components/relationships/ContactContext.jsx` - Notes section
- `src/components/relationships/ContactInteractions.jsx` - History
- `src/components/relationships/ContactLinks.jsx` - Related items
- `src/components/relationships/ContactModal.jsx` - Create/edit
- `src/components/relationships/GroupFilter.jsx` - Group sidebar
- `src/components/relationships/GroupModal.jsx` - Group editor
- `src/components/relationships/LogInteractionModal.jsx` - Log modal
- `src/components/relationships/InteractionTimeline.jsx` - History view
- `src/services/RelationshipService.js` - Business logic
- `src/utils/freshness.js` - Freshness calculation

### Files to Modify
- `src/App.jsx` - Add Relationships to router

### Database Tables Used
```sql
SELECT * FROM contacts;
SELECT * FROM contact_groups;
SELECT * FROM contact_group_members;
SELECT * FROM contact_interactions;

-- Freshness query
SELECT *,
  julianday('now') - julianday(last_contact_at) as days_since
FROM contacts
ORDER BY days_since DESC;
```

### IPC Channels
- `contacts:get-all` - List all contacts
- `contacts:get-by-id` - Get single contact
- `contacts:create` - Create contact
- `contacts:update` - Update contact
- `contacts:delete` - Delete contact
- `contacts:search` - Search contacts
- `contacts:log-interaction` - Log new interaction
- `contacts:get-interactions` - Get interaction history
- `groups:get-all` - List groups
- `groups:create` - Create group
- `groups:update` - Update group
- `groups:delete` - Delete group
- `groups:add-member` - Add contact to group
- `groups:remove-member` - Remove contact from group

## Implementation Hints

- Use CSS Grid for master-detail layout (1fr 2fr on desktop)
- Freshness should update automatically when list is viewed
- Consider Gravatar for avatar images based on email
- Social links should use icons (Twitter, LinkedIn, GitHub SVGs)
- Slug should be URL-safe lowercase (spaces to hyphens)
- Agent to use: `electron-react-dev`

## Testing Checklist

- [ ] Unit tests for RelationshipService methods
- [ ] Freshness calculation returns correct categories
- [ ] Search filters contacts correctly
- [ ] CRUD operations work for contacts and groups
- [ ] Interaction logging updates last_contact_at
- [ ] Master-detail layout responds to selection
- [ ] Group filtering works correctly
- [ ] Empty states for no contacts, no interactions
- [ ] Keyboard navigation in contact list

---
**Notes**: This CRM is about "depth over sales" - focus on genuine relationship context, not pipeline metrics. The freshness system creates gentle pressure to stay in touch without being overwhelming. The goal is "show up for people better and more consistently."
