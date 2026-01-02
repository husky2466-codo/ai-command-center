# CLAUDE.md - {{PROJECT_NAME}}

## Overview
{{PROJECT_DESCRIPTION}}

**Tech Stack:** {{TECH_STACK}}
**Project Type:** {{PROJECT_TYPE}}
**Location:** {{FS_PATH}}
**Created:** {{DATE}}

## Build & Development Commands

{{#if_node}}
```bash
# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Test
npm test

# Lint
npm run lint
```
{{/if_node}}

{{#if_python}}
```bash
# Install dependencies
pip install -r requirements.txt

# Development
python main.py

# Test
pytest

# Lint
black . && flake8
```
{{/if_python}}

{{#if_electron_react}}
```bash
# Install dependencies
npm install

# Development (React only)
npm run dev

# Development (Electron + React)
npm run dev:electron

# Build for production
npm run build
npm run build:electron  # Creates distributable in release/

# Test
npm test
```
{{/if_electron_react}}

{{#if_rust}}
```bash
# Build
cargo build

# Development (with auto-reload)
cargo watch -x run

# Build release
cargo build --release

# Test
cargo test

# Lint
cargo clippy
```
{{/if_rust}}

{{#if_go}}
```bash
# Build
go build

# Development
go run .

# Test
go test ./...

# Lint
golangci-lint run
```
{{/if_go}}

{{#if_other}}
```bash
# Add your build and development commands here
# Example:
# make build
# make run
# make test
```
{{/if_other}}

## Architecture Overview

### Project Structure
```
{{PROJECT_NAME}}/
├── src/                # Source code
├── tests/              # Test files
├── docs/               # Documentation
├── README.md           # Project overview
├── CLAUDE.md           # This file - AI assistant guidance
└── CLAUDELONGTERM.md   # Persistent project memory
```

### Key Components
[Describe the main modules, components, or services in your project]

### Design Patterns
[Document any architectural patterns or design decisions]

## Key Files

| File | Purpose |
|------|---------|
| src/ | Source code directory |
| tests/ | Test files and test data |
| docs/ | Project documentation |
| README.md | User-facing documentation |
| CLAUDE.md | AI assistant guidance (this file) |

## Development Workflow

### Starting a New Feature
1. Check existing project status: `curl http://localhost:3939/api/projects?name={{PROJECT_NAME}}`
2. Create a task: `curl -X POST http://localhost:3939/api/tasks -d '{"project_id": "...", "title": "Feature name"}'`
3. Implement the feature
4. Update tests
5. Mark task complete: `curl -X PUT http://localhost:3939/api/tasks/TASK_ID -d '{"status": "completed"}'`

### Before Committing
- Run tests
- Update documentation
- Log important decisions to AI Command Center memories
- Update this CLAUDE.md with session notes

## Testing Strategy

### Unit Tests
[Describe unit testing approach]

### Integration Tests
[Describe integration testing approach]

### Manual Testing
[List manual test scenarios]

## Deployment

### Local Development
[Instructions for running locally]

### Production Build
[Instructions for production deployment]

### Environment Variables
[List required environment variables]

## Project-Specific Agents

Located in `.claude/agents/`:

*No custom agents yet. Add agents as needed for:*
- Feature development
- Bug fixing
- Code review
- Documentation
- Testing

## Slash Commands

Located in `.claude/commands/`:

*No custom commands yet. Add commands as needed for:*
- Build automation
- Testing workflows
- Deployment tasks
- Code generation

## AI Command Center Integration

This project is tracked by AI Command Center at http://localhost:3939

### Quick Commands

```bash
# Check project status
curl http://localhost:3939/api/projects?name={{PROJECT_NAME}}

# List active tasks
curl http://localhost:3939/api/tasks?project_id=PROJECT_UUID

# Create a task
curl -X POST http://localhost:3939/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "PROJECT_UUID",
    "title": "Task description",
    "energy_type": "deep_work",
    "status": "pending"
  }'

# Update project progress
curl -X PUT http://localhost:3939/api/projects/PROJECT_UUID \
  -H "Content-Type: application/json" \
  -d '{"progress": 0.5}'

# Log a decision
curl -X POST http://localhost:3939/api/memories \
  -H "Content-Type: application/json" \
  -d '{
    "type": "decision",
    "category": "architecture",
    "title": "Decision title",
    "content": "Description of decision and reasoning"
  }'
```

### Project Metadata
- **Project ID:** [Set after registration with ACC]
- **Status:** on_deck
- **Progress:** Auto-calculated from milestones (see D:\Projects\ai-command-center\electron\services\projectWatcher.cjs)
- **Space:** default

### Milestones
Progress is automatically calculated based on:
- [ ] README.md exists
- [ ] package.json/requirements.txt/Cargo.toml exists
- [ ] src/ directory exists with files
- [ ] tests/ directory exists with tests
- [ ] Build artifacts generated
- [ ] .git directory exists (version control)

## Troubleshooting

### Common Issues
[List common problems and solutions]

### Debug Mode
[Instructions for enabling verbose logging]

### Getting Help
- Check docs/ for detailed documentation
- Review CLAUDELONGTERM.md for project history
- Search AI Command Center knowledge base: `curl -X POST http://localhost:3939/api/knowledge/search -d '{"query": "your-question"}'`

## Session Notes

### {{DATE}} - Project Initialized

**Created:** Initial project structure with /init command

**Files Created:**
- README.md - Project overview and user documentation
- CLAUDE.md - AI assistant guidance (this file)
- CLAUDELONGTERM.md - Persistent project memory
- .gitignore - Version control exclusions
- src/ - Source code directory
- tests/ - Test files directory
- docs/ - Documentation directory

**Next Steps:**
1. Initialize git repository: `git init`
2. Register project with AI Command Center
3. Set up development environment
4. Create initial implementation plan
5. Start coding!

---

## Notes for Claude Code

- This file should be updated after each significant development session
- Log important decisions, discoveries, and changes in Session Notes
- Keep architecture diagrams and component descriptions current
- Document any gotchas or lessons learned
- Use AI Command Center API to track tasks and progress
