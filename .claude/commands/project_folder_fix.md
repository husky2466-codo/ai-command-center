# Fix Project Folder Structure

You are helping the user fix an existing project folder to be compatible with AI Command Center's project tracking system.

## Project Name

The project to fix is: **$ARGUMENTS**

If $ARGUMENTS is empty, ask the user:
- "Which project folder would you like to fix? Provide the project name or full path."

## Overview

This command analyzes an existing project folder and brings it into compliance with the AI Command Center standard structure, enabling proper project tracking, progress calculation, and integration with the ACC API.

## Required Structure

AI Command Center expects projects to have this structure for full compatibility:

```
<project-name>/
├── README.md                 # Project overview (+10% progress)
├── CLAUDE.md                 # Claude Code context file
├── CLAUDELONGTERM.md         # Long-term patterns (optional)
├── .gitignore                # Version control ignore rules
├── .env.example              # Environment template (if applicable)
├── package.json              # For Node/JS projects (+10% progress)
├── .claude/
│   ├── agents/               # Project-specific agents
│   └── commands/             # Project-specific commands
├── src/                      # Source directory (+15% progress)
├── tests/                    # Test directory (+10% progress)
├── build/ or dist/           # Build output (+15% progress)
├── .git/                     # Git repository (+10% progress)
└── docs/                     # Documentation folder
```

## Execution Steps

### Step 1: Locate and Analyze Project

Use a subagent to explore the project:

```
Launch subagent_type: "Explore" with prompt:
"Analyze the project folder at D:\Projects\<project-name> (or the provided path).

Report:
1. Current folder structure (tree view)
2. What files/folders already exist from the standard structure
3. What's missing from the standard structure
4. Project type detection (node, python, rust, go, electron-react, other)
5. Any existing README.md, CLAUDE.md content
6. Whether .git is initialized
7. Any obvious project-specific patterns or conventions

Be thorough - check for package.json, requirements.txt, Cargo.toml, go.mod, etc."
```

### Step 2: Generate Missing Files

Based on the analysis, use a subagent to create missing files:

```
Launch subagent_type: "general-purpose" with prompt:
"Based on the project analysis, create the missing standard files for <project-name>.

Project Path: D:\Projects\<project-name>
Project Type: <detected type>
Existing Files: <list from step 1>
Missing Files: <list from step 1>

For each missing file, generate appropriate content:

1. **README.md** (if missing):
   - Scan existing code to understand the project
   - Generate a proper README with: title, description, tech stack, quick start, structure
   - If README exists but is minimal, enhance it

2. **CLAUDE.md** (if missing):
   - Create comprehensive Claude Code context
   - Include: project overview, build commands, architecture, key files
   - Add session notes section with today's date

3. **CLAUDELONGTERM.md** (if missing):
   - Create minimal starter template
   - Sections: Architectural Decisions, Patterns, Known Issues, Optimizations

4. **.gitignore** (if missing or incomplete):
   - Generate comprehensive gitignore for the detected project type
   - Merge with existing if present

5. **.env.example** (if missing and project uses env vars):
   - Scan for environment variable usage
   - Create template with placeholders

6. **Folders** (create if missing):
   - .claude/agents/
   - .claude/commands/
   - src/ (if no source directory exists)
   - tests/ (if no test directory exists)
   - docs/

IMPORTANT:
- DO NOT overwrite existing files without asking
- If a file exists, report what would need to change
- Preserve all existing project content
- Adapt to the project's existing conventions"
```

### Step 3: Initialize Git (if needed)

If .git doesn't exist:

```bash
cd D:\Projects\<project-name>
git init
git add .
git commit -m "chore: Add AI Command Center project structure"
```

If .git exists but new files were added:
```bash
git add README.md CLAUDE.md CLAUDELONGTERM.md .gitignore .env.example .claude/
git commit -m "chore: Add AI Command Center compatibility files"
```

### Step 4: Register/Update in AI Command Center

Check if project is already registered:

```bash
curl http://localhost:3939/api/projects
```

Search the response for a project with matching name or fs_path.

**If NOT registered**, create it:
```bash
curl -X POST http://localhost:3939/api/projects \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"<project-name>\",
    \"description\": \"<extracted from README or code analysis>\",
    \"status\": \"on_deck\",
    \"fs_path\": \"D:\\\\Projects\\\\<project-name>\",
    \"planning_notes\": \"Project structure fixed for ACC compatibility on <current-date>\"
  }"
```

**If already registered**, update it:
```bash
curl -X PUT http://localhost:3939/api/projects/<project-id> \
  -H "Content-Type: application/json" \
  -d "{
    \"planning_notes\": \"Project structure updated for ACC compatibility on <current-date>\"
  }"
```

### Step 5: Verify Progress Calculation

After registration, the project watcher should calculate progress based on:
- README.md (+10%)
- package.json/requirements.txt/Cargo.toml (+10%)
- src/ directory (+15%)
- tests/ directory (+10%)
- build/dist/ directory (+15%)
- .git/ directory (+10%)
- Recent file activity (+0-30%)

Report the expected progress percentage to the user.

## Output Summary

Provide a comprehensive report:

```
Project Folder Fix Complete: <project-name>

Analysis:
- Project Type: <type>
- Original Structure: <brief description>
- Missing Components: <count>

Files Created:
- [x] README.md (created/enhanced/skipped)
- [x] CLAUDE.md (created/skipped)
- [x] CLAUDELONGTERM.md (created/skipped)
- [x] .gitignore (created/merged/skipped)
- [x] .env.example (created/skipped)

Folders Created:
- [x] .claude/agents/
- [x] .claude/commands/
- [x] src/ (or existing: <actual name>)
- [x] tests/ (or existing: <actual name>)
- [x] docs/

Git Status:
- Repository: <initialized/already existed>
- Commit: <commit message if new commit made>

AI Command Center:
- Registration: <created/updated/failed>
- Project ID: <UUID>
- Expected Progress: <percentage>%

Project Path: D:\Projects\<project-name>

The project is now fully compatible with AI Command Center!
You can track it in the Projects tab and use the ACC API.
```

## Error Handling

- If project folder doesn't exist: Report error and ask for correct path
- If permission denied: Report which files couldn't be modified
- If ACC API unavailable: Complete file setup, warn about registration
- If git operations fail: Report error, continue with other steps

## Special Cases

### Monorepo Detection
If the folder contains multiple projects (packages/, apps/, workspaces):
- Report this to the user
- Ask if they want to register sub-projects individually
- Offer to create a parent project entry

### Non-Standard Source Directories
If source code is in a different folder (lib/, app/, core/):
- Don't create an empty src/ folder
- Document the actual structure in CLAUDE.md
- Note this in the summary

### Existing CLAUDE.md
If CLAUDE.md already exists:
- Read and preserve existing content
- Only add missing sections (Session Notes, etc.)
- Ask before making changes

## Notes

- Always preserve existing project conventions
- Don't force unnecessary structure changes
- The goal is compatibility, not conformity
- Projects can have additional folders beyond the standard structure
