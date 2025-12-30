# Security Scanner Module (Future Feature)

## Overview

Add a 13th module to AI Command Center that provides integrated security scanning via Semgrep, with findings tracking and dashboard integration.

---

## Prerequisites

- Semgrep MCP installed globally: `claude mcp add semgrep --scope user -- uvx semgrep-mcp`
- Semgrep CLI available: `pip install semgrep`

---

## Features

### 1. Project Scanner UI

- Directory picker to select project path
- Scan button with progress indicator
- Findings table with columns:
  - Severity (Critical/High/Medium/Low)
  - Category (SAST/Secrets/Supply Chain)
  - File path + line number
  - Rule ID + message
  - Resolved status
- Filters by severity and category
- Click-to-open file in VS Code or terminal

### 2. Findings History

- SQLite table storing all scan results
- Track findings over time per project
- Mark findings as resolved with timestamp
- Diff view: compare current vs previous scan

### 3. Dashboard Widget

- Shield icon with color status (green/yellow/red)
- Count of open findings by severity
- Quick link to Security Scanner module
- Last scan timestamp

### 4. Terminal Integration

- View raw Semgrep JSON output
- Run custom Semgrep commands
- Export findings to file

---

## Implementation

### Files to Create

```
src/components/
  SecurityScanner.jsx       # Main module component

electron/
  services/
    semgrep.cjs            # Semgrep CLI wrapper
  database/
    migrations/
      007_security.sql     # Findings table

specs/components/
  SECURITY-SCANNER.md      # Component spec
```

### Database Schema

```sql
CREATE TABLE security_findings (
  id INTEGER PRIMARY KEY,
  project_path TEXT NOT NULL,
  scan_date TEXT NOT NULL,
  finding_id TEXT,
  severity TEXT,  -- critical, high, medium, low
  category TEXT,  -- sast, secrets, supply-chain
  file_path TEXT,
  line_number INTEGER,
  message TEXT,
  rule_id TEXT,
  resolved INTEGER DEFAULT 0,
  resolved_date TEXT
);

CREATE INDEX idx_findings_project ON security_findings(project_path);
CREATE INDEX idx_findings_severity ON security_findings(severity);
```

### IPC Handlers

```javascript
// electron/main.cjs

ipcMain.handle('security:scan', async (event, projectPath) => {
  // Spawn: semgrep scan --json <projectPath>
  // Parse JSON output
  // Store in database
  // Return findings array
});

ipcMain.handle('security:getFindings', async (event, projectPath) => {
  // Query findings from database for project
});

ipcMain.handle('security:markResolved', async (event, findingId) => {
  // Update finding as resolved with timestamp
});

ipcMain.handle('security:getStats', async (event) => {
  // Return aggregate stats for dashboard widget
});
```

### Component Structure

```jsx
// src/components/SecurityScanner.jsx

const SecurityScanner = () => {
  const [projectPath, setProjectPath] = useState('');
  const [findings, setFindings] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState({ severity: 'all', category: 'all' });

  const runScan = async () => {
    setScanning(true);
    const results = await window.electron.invoke('security:scan', projectPath);
    setFindings(results);
    setScanning(false);
  };

  return (
    <div className="security-scanner">
      <header>
        <DirectoryPicker value={projectPath} onChange={setProjectPath} />
        <Button onClick={runScan} disabled={scanning}>
          {scanning ? 'Scanning...' : 'Run Scan'}
        </Button>
      </header>
      <FilterBar filter={filter} onChange={setFilter} />
      <FindingsTable findings={findings} filter={filter} />
    </div>
  );
};
```

---

## Design System Integration

- **Icon**: `Shield` from lucide-react
- **Colors**:
  - Critical: `text-red-500`
  - High: `text-orange-500`
  - Medium: `text-yellow-500`
  - Low: `text-blue-500`
- **Layout**: Split panel (findings list | detail view)
- **Theme**: Follows existing theme context

---

## Sidebar Entry

```jsx
{
  id: 'security',
  label: 'Security',
  icon: Shield,
  component: SecurityScanner,
  badge: openFindingsCount > 0 ? openFindingsCount : null,
  badgeColor: criticalCount > 0 ? 'red' : highCount > 0 ? 'orange' : 'yellow'
}
```

---

## Related

- Semgrep MCP: `claude mcp add semgrep --scope user -- uvx semgrep-mcp`
- Semgrep docs: https://semgrep.dev/docs
- Semgrep rules: https://semgrep.dev/r
