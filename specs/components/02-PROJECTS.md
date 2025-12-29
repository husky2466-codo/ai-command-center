# Projects System

**Status**: Not Started
**Priority**: P1 (High)
**Estimated Effort**: 8 days
**Dependencies**:
- `specs/features/DATABASE-LAYER.md` - SQLite setup required
- `specs/features/SHARED-COMPONENTS.md` - Card, Modal components
- `specs/components/00-CSS-VARIABLES.md` - Design tokens (required)

> **Design Reference**: [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) | [00-CSS-VARIABLES.md](00-CSS-VARIABLES.md)

---

## Design Guidelines

### Module Identity
- **Primary Accent**: Purple `--module-projects` (#8b5cf6)
- **Visual Theme**: Three-tier organization, energy-based task matching

### Color Usage
| Element | Variable | Hex |
|---------|----------|-----|
| Module accent | `--module-projects` | #8b5cf6 |
| Card backgrounds | `--bg-card` | #2d2d4a |
| Progress bars | Purple gradient | #8b5cf6 -> #3b82f6 |
| Status badges | Per status (see below) | Various |

### Energy Type Colors (Critical)
```css
--energy-low: #6b7280;        /* Gray */
--energy-quick-win: #22c55e;  /* Green */
--energy-deep-work: #8b5cf6;  /* Purple */
--energy-creative: #ec4899;   /* Pink */
--energy-execution: #f59e0b;  /* Orange */
--energy-people: #3b82f6;     /* Blue */
```

### Icon Style
- Line art, 2px stroke weight
- Project icons: folder, layers, check-square, target
- Energy icons: bolt, brain, palette, rocket, users

### Layout Pattern - Three Tiers
```
LIFE VIEW (30,000 ft)          PROJECTS VIEW (10,000 ft)
+------------------+           +-------------------------+
| SPACE CARDS      |           | Active Focus            |
| [Work] [Personal]|    ->     |   [Project 1] [Proj 2]  |
| [Health] [Learn] |           | On Deck                 |
+------------------+           |   [Project 3]           |
                               +-------------------------+

NOW VIEW (Ground Level)
+----------------------------------------+
| [All] [Quick Win] [Deep Work] [...]    |  <- Energy Filters
+----------------------------------------+
| [ ] Task 1  [Quick Win]  Due: Today    |
| [ ] Task 2  [Deep Work]  Due: Tomorrow |
+----------------------------------------+
```

### Component Specifics
- **Space Cards**: Large cards with icon, project count, color accent
- **Project Cards**: Progress bar, next action preview, deadline
- **Task Items**: Checkbox left, energy badge right, inline edit
- **Energy Filter Bar**: Pill buttons with counts, multi-select

### Design Checklist
- [ ] Background uses `--bg-primary` (#1a1a2e)
- [ ] Purple accent for module-specific highlights
- [ ] Energy badges use correct colors per type
- [ ] Progress bars animate smoothly
- [ ] Three-tier navigation is intuitive
- [ ] Drag-and-drop has visual feedback

---

## Overview

The Projects system is a three-tier task management system organized as Life (30,000 ft) > Projects (10,000 ft) > Now (ground level). It features energy-based task filtering, allowing users to match work to their current mood/energy level. Projects belong to Spaces (life areas), and tasks belong to projects with energy type tags.

## Acceptance Criteria

- [ ] Life View shows all Spaces with project counts
- [ ] Projects View shows all projects grouped by status (Active Focus, On Deck, Growing, On Hold, Completed)
- [ ] Projects can be sorted by: Next Action, Due Date, Progress, Last Updated
- [ ] Now View shows all tasks filterable by energy type
- [ ] Energy type filter buttons: All, Quick Win, Deep Work, Creative, Execution, People Work
- [ ] Tasks have: title, description, energy type, status, due date
- [ ] Projects have: progress bar (auto-calculated from task completion), deadline, planning notes
- [ ] Drag-and-drop reordering within task lists
- [ ] Create/Edit/Delete operations for Spaces, Projects, and Tasks

## Tasks

### Section 1: Directory and Component Structure
- [ ] Create `src/components/projects/` directory
  - [ ] Create `ProjectsApp.jsx` - Main container with view switcher
  - [ ] Create `ProjectsApp.css` - Projects-specific styles
- [ ] Create view components
  - [ ] `LifeView.jsx` - Space cards overview
  - [ ] `ProjectsView.jsx` - Project list with grouping
  - [ ] `NowView.jsx` - Task list with energy filters

### Section 2: Life View (30,000 ft)
- [ ] Create `LifeView.jsx`
  - [ ] Render Space cards in grid layout
  - [ ] Show project count per space
  - [ ] Display space color and icon
  - [ ] Add "Create Space" button
- [ ] Create `SpaceCard.jsx`
  - [ ] Show space name, description, color
  - [ ] Display project count and active project indicator
  - [ ] Click to filter Projects View by space

### Section 3: Projects View (10,000 ft)
- [ ] Create `ProjectsView.jsx`
  - [ ] Implement view toggle for sort options
  - [ ] Group projects by status sections
- [ ] Create status group components
  - [ ] `ProjectSection.jsx` - Collapsible section by status
  - [ ] Section headers: Active Focus, On Deck, Growing, On Hold, Completed
- [ ] Create `ProjectCard.jsx`
  - [ ] Display project name, space tag, progress bar
  - [ ] Show task count (completed/total)
  - [ ] Display next action preview
  - [ ] Show deadline with urgency coloring
  - [ ] Add attention indicator for blocked projects

### Section 4: Now View (Ground Level)
- [ ] Create `NowView.jsx`
  - [ ] Implement energy type filter bar
  - [ ] Display task list filtered by current selection
- [ ] Create `EnergyFilterBar.jsx`
  - [ ] Render filter buttons with counts
  - [ ] Color-code by energy type
  - [ ] Support multi-select (toggle behavior)
- [ ] Create `TaskList.jsx`
  - [ ] Render tasks in order
  - [ ] Support drag-and-drop reordering
  - [ ] Show task details inline or expand-on-click
- [ ] Create `TaskItem.jsx`
  - [ ] Checkbox for completion
  - [ ] Energy type badge (colored)
  - [ ] Due date with relative time
  - [ ] Project name link

### Section 5: Create/Edit Modals
- [ ] Create `SpaceModal.jsx`
  - [ ] Name, description, color picker, icon selector
  - [ ] Validate required fields
- [ ] Create `ProjectModal.jsx`
  - [ ] Name, description, space selector, status, deadline
  - [ ] Planning notes textarea (markdown support)
- [ ] Create `TaskModal.jsx`
  - [ ] Title, description, project selector
  - [ ] Energy type dropdown
  - [ ] Due date picker
  - [ ] Status dropdown

### Section 6: Project Service
- [ ] Create `src/services/ProjectService.js`
  - [ ] CRUD operations for spaces, projects, tasks
  - [ ] `getProjectsByStatus()` - Group by status
  - [ ] `getTasksByEnergy()` - Filter by energy type
  - [ ] `updateProjectProgress()` - Recalculate from tasks
  - [ ] `getNextAction()` - Get top incomplete task

### Section 7: Drag and Drop
- [ ] Implement drag-and-drop for tasks
  - [ ] Reorder within same project
  - [ ] Move between projects (optional)
- [ ] Update sort_order in database on drop
- [ ] Persist order between sessions

### Section 8: Progress Calculation
- [ ] Implement automatic progress calculation
  - [ ] `progress = completed_tasks / total_tasks * 100`
  - [ ] Update on task completion/creation/deletion
- [ ] Add manual progress override option

### Section 9: Energy Type System
- [ ] Define energy types as constants
  ```javascript
  const ENERGY_TYPES = {
    low: { label: 'Low', color: '#6b7280' },
    medium: { label: 'Medium', color: '#3b82f6' },
    deep_work: { label: 'Deep Work', color: '#7c3aed' },
    creative: { label: 'Creative', color: '#ec4899' },
    quick_win: { label: 'Quick Win', color: '#22c55e' },
    execution: { label: 'Execution', color: '#f97316' },
    people_work: { label: 'People Work', color: '#14b8a6' }
  };
  ```
- [ ] Create `src/constants/energyTypes.js`
- [ ] Use in filter bar, task badges, and dropdowns

## Technical Details

### Files to Create
- `src/components/projects/ProjectsApp.jsx` - Main container
- `src/components/projects/ProjectsApp.css` - Styles
- `src/components/projects/LifeView.jsx` - Spaces overview
- `src/components/projects/ProjectsView.jsx` - Projects list
- `src/components/projects/NowView.jsx` - Tasks with filters
- `src/components/projects/SpaceCard.jsx` - Space display card
- `src/components/projects/ProjectSection.jsx` - Status group
- `src/components/projects/ProjectCard.jsx` - Project display
- `src/components/projects/EnergyFilterBar.jsx` - Filter buttons
- `src/components/projects/TaskList.jsx` - Draggable task list
- `src/components/projects/TaskItem.jsx` - Individual task
- `src/components/projects/SpaceModal.jsx` - Create/edit space
- `src/components/projects/ProjectModal.jsx` - Create/edit project
- `src/components/projects/TaskModal.jsx` - Create/edit task
- `src/services/ProjectService.js` - Business logic
- `src/constants/energyTypes.js` - Energy type definitions

### Files to Modify
- `src/App.jsx` - Add Projects to router/tabs

### Database Tables Used
```sql
-- From schema
SELECT * FROM spaces;
SELECT * FROM projects;
SELECT * FROM tasks;
```

### IPC Channels
- `projects:get-spaces` - List all spaces
- `projects:create-space` - Create new space
- `projects:update-space` - Update space
- `projects:delete-space` - Delete space
- `projects:get-projects` - List projects (with filters)
- `projects:create-project` - Create project
- `projects:update-project` - Update project
- `projects:delete-project` - Delete project
- `projects:get-tasks` - List tasks (with filters)
- `projects:create-task` - Create task
- `projects:update-task` - Update task
- `projects:delete-task` - Delete task
- `projects:reorder-tasks` - Update sort orders

## Implementation Hints

- Use React DnD or @dnd-kit for drag-and-drop functionality
- Implement optimistic updates for smooth UX
- Cache project/task lists with React Query or SWR pattern
- Progress bars should animate smoothly on update
- Consider virtualization for large task lists (react-window)
- Agent to use: `electron-react-dev`

## Testing Checklist

- [ ] Unit tests for ProjectService methods
- [ ] All views render correctly with mock data
- [ ] CRUD operations work for spaces, projects, tasks
- [ ] Energy filter correctly filters task list
- [ ] Drag-and-drop persists order changes
- [ ] Progress calculation updates on task changes
- [ ] Modals validate input before submission
- [ ] Empty states handled gracefully
- [ ] Keyboard navigation works in task list

---
**Notes**: The three-tier view is key to avoiding overwhelm. Life view for big picture, Projects for planning, Now for execution. Energy filtering is the "secret sauce" - users should feel empowered to pick work matching their current state.
