# Initialize New Project

You are helping the user bootstrap a new project with a standardized folder structure, configuration files, and AI Command Center integration.

## Project Name

The project name is: **$ARGUMENTS**

If $ARGUMENTS is empty, ask the user:
- "What is your project name?"

## Step 1: Gather Project Information

If not already provided, ask the user for the following (one question at a time, conversationally):

1. **Project type**: node, python, electron-react, rust, go, other
2. **Brief description**: One sentence describing what this project does
3. **Tech stack details**: Key frameworks, libraries, or tools (e.g., "React 18 + Vite + Tailwind", "FastAPI + PostgreSQL", "Actix-web + Diesel")

## Step 2: Create Project Directory

Create the project at: `D:\Projects\<project-name>\`

Use the following folder structure:

```
<project-name>/
├── README.md                 # Auto-generated with project info
├── CLAUDE.md                 # Claude Code context file
├── CLAUDELONGTERM.md         # Long-term patterns (minimal starter)
├── .gitignore                # Comprehensive gitignore for project type
├── .env.example              # Environment template
├── .claude/
│   ├── agents/               # Project-specific agents (empty initially)
│   └── commands/             # Project-specific commands (empty initially)
├── src/                      # Source directory
├── tests/                    # Test directory
└── docs/                     # Documentation folder
```

## Step 3: Generate Files

### README.md

Generate a comprehensive README with:

```markdown
# <Project Name>

<Brief description from user>

## Tech Stack

<Tech stack details from user>

## Quick Start

<Build & development commands based on project type - see templates below>

## Project Structure

```
<Folder structure from Step 2>
```

## Development

See `CLAUDE.md` for detailed context for AI assistants.

## License

<Choose appropriate license or mark as proprietary>
```

### CLAUDE.md

Generate a detailed context file:

```markdown
# CLAUDE.md - <Project Name>

This file provides guidance to Claude Code when working with this project.

## Project Overview

**Name**: <Project Name>
**Type**: <Project Type>
**Description**: <Description from user>
**Tech Stack**: <Tech stack details>

## Build & Development Commands

<Insert appropriate commands based on project type - see templates below>

## Architecture Overview

<Placeholder - to be filled as project develops>

```
<Folder structure>
```

## Key Files

<Placeholder - to be filled with important file descriptions>

## Environment Variables

See `.env.example` for required environment variables.

## Session Notes

### <Current Date> - Project Initialization

- Created project structure
- Generated configuration files
- Registered with AI Command Center
- Ready for development

---
```

### CLAUDELONGTERM.md

Generate a minimal starter:

```markdown
# CLAUDELONGTERM.md - <Project Name>

This file tracks long-term patterns, decisions, and learnings about this project.

## Architectural Decisions

<To be filled as major decisions are made>

## Patterns & Conventions

<To be filled with code patterns and conventions>

## Known Issues & Gotchas

<To be filled with important warnings and pitfalls>

## Performance Optimizations

<To be filled with optimization notes>

---

**Last Updated**: <Current Date>
```

### .gitignore

Generate a comprehensive .gitignore based on project type:

**For node/electron-react**:
```
# Dependencies
node_modules/
package-lock.json
yarn.lock

# Build outputs
dist/
build/
release/
out/

# Environment files
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
desktop.ini

# Logs
*.log
logs/
npm-debug.log*

# Testing
coverage/
.nyc_output/

# Misc
*.tsbuildinfo
.cache/
```

**For python**:
```
# Virtual environments
venv/
env/
.venv/
.env/

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python

# Distribution
build/
dist/
*.egg-info/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp

# Testing
.pytest_cache/
.coverage
htmlcov/

# Misc
*.log
.DS_Store
```

**For rust**:
```
# Build
target/
Cargo.lock

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Misc
*.log
```

**For go**:
```
# Binaries
*.exe
*.exe~
*.dll
*.so
*.dylib
bin/

# Build
*.test
*.out
vendor/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Misc
*.log
```

**For other**: Use a minimal generic template.

### .env.example

Generate based on project type:

```bash
# <Project Name> Environment Variables
# Copy this file to .env and fill in the values

# Development
NODE_ENV=development

# API Keys
# OPENAI_API_KEY=your-key-here
# ANTHROPIC_API_KEY=your-key-here

# Database (if applicable)
# DATABASE_URL=postgresql://localhost:5432/dbname

# Application
# PORT=3000
```

## Step 4: Initialize Git

Execute the following commands:

1. Check if git is already initialized:
   ```bash
   cd D:\Projects\<project-name>
   git status
   ```

2. If not initialized:
   ```bash
   git init
   git add .
   git commit -m "Initial project setup - bootstrapped with /init command"
   ```

## Step 5: Register with AI Command Center

Make an API call to register the project:

```bash
curl -X POST http://localhost:3939/api/projects \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"<project-name>\",
    \"description\": \"<description from user>\",
    \"status\": \"on_deck\",
    \"fs_path\": \"D:\\\\Projects\\\\<project-name>\",
    \"planning_notes\": \"Project initialized with /init command on <current-date>\"
  }"
```

If the API call fails (ACC not running, network error, etc.):
- Report the error to the user
- Suggest they manually register the project later
- Continue with the rest of the setup

## Step 6: Build & Development Command Templates

Use these templates in README.md and CLAUDE.md based on project type:

### node
```bash
# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Test
npm test
```

### python
```bash
# Create virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Unix)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run
python main.py

# Test
pytest
```

### electron-react
```bash
# Install dependencies
npm install

# Development (React only)
npm run dev

# Development (Electron + React)
npm run dev:electron

# Build
npm run build

# Package for distribution
npm run build:electron
```

### rust
```bash
# Build
cargo build

# Development (with auto-reload)
cargo watch -x run

# Release build
cargo build --release

# Test
cargo test

# Run
cargo run
```

### go
```bash
# Build
go build

# Development
go run main.go

# Test
go test ./...

# Install dependencies
go mod download

# Tidy dependencies
go mod tidy
```

### other
```bash
# Add your build/dev commands here
# Update this section based on your tech stack
```

## Step 7: Output Summary

After completing all steps, provide a comprehensive summary to the user:

```
Project initialization complete!

Created Files:
- README.md
- CLAUDE.md
- CLAUDELONGTERM.md
- .gitignore
- .env.example

Created Folders:
- .claude/agents/
- .claude/commands/
- src/
- tests/
- docs/

Git Repository:
- Initialized: Yes
- Initial commit: "Initial project setup - bootstrapped with /init command"

AI Command Center:
- Registration: <Success/Failed with reason>
- Project ID: <UUID if successful>
- Status: on_deck

Project Path: D:\Projects\<project-name>

Next Steps:
1. Review and customize CLAUDE.md with project-specific details
2. Copy .env.example to .env and fill in values
3. Install dependencies (see README.md)
4. Start development!

Pro tip: The project is registered in AI Command Center as "on_deck".
You can track tasks, log knowledge, and manage progress via the ACC API or UI.
```

## Important Notes

- Always use absolute paths (D:\Projects\<project-name>\)
- Respect existing files - if README.md exists, ask before overwriting
- If .git already exists, skip git init step
- If ACC API fails, continue setup but warn the user
- Use the current date in all templates (format: YYYY-MM-DD)
- Be conversational and enthusiastic - project initialization is exciting!

## Error Handling

If any step fails:
1. Report the specific error clearly
2. Suggest a solution if possible
3. Continue with remaining steps if possible
4. Summarize which steps succeeded and which failed at the end
