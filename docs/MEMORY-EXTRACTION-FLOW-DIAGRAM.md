# Memory Extraction Service - Flow Diagrams

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Memory Extraction Service                    │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │         extractMemoriesFromChunk(chunk, apiKey)           │ │
│  │                                                           │ │
│  │   Step 1: Check CLI Availability                         │ │
│  │   Step 2: Try CLI Extraction (if available)              │ │
│  │   Step 3: Fallback to API (if needed)                    │ │
│  │   Step 4: Return memories array                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │checkCli      │  │extractWith   │  │extractWith   │         │
│  │Availability()│  │Cli()         │  │Api()         │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
┌─────────────────────┐         ┌─────────────────────┐
│   Claude CLI        │         │  Anthropic API      │
│   (OAuth)           │         │  (API Key)          │
└─────────────────────┘         └─────────────────────┘
```

## Detailed Execution Flow

```
extractMemoriesFromChunk(conversationChunk, apiKey)
│
├─► checkCliAvailability()
│   │
│   ├─► window.electronAPI.claudeCli exists?
│   │   ├─► NO  → return { available: false, authenticated: false }
│   │   └─► YES → continue
│   │
│   ├─► claudeCli.check()
│   │   ├─► available: false → return { available: false }
│   │   └─► available: true  → continue
│   │
│   └─► claudeCli.checkOAuth()
│       ├─► authenticated: false → return { available: true, authenticated: false }
│       └─► authenticated: true  → return { available: true, authenticated: true }
│
├─► If cliStatus.authenticated === true:
│   │
│   ├─► Log: "Using Claude CLI for memory extraction"
│   │
│   ├─► extractWithCli(conversationChunk, systemPrompt)
│   │   │
│   │   ├─► Build combined prompt
│   │   │
│   │   ├─► claudeCli.query(prompt, { maxTokens: 4000, model: '...' })
│   │   │   │
│   │   │   ├─► Success → Parse JSON → return { success: true, memories: [...] }
│   │   │   └─► Failure → return { success: false, error: '...' }
│   │   │
│   │   └─► Return result
│   │
│   ├─► If result.success:
│   │   ├─► Log: "CLI extraction successful: X memories found"
│   │   └─► RETURN memories array ✅
│   │
│   └─► If !result.success:
│       ├─► Log: "CLI extraction failed, falling back to API: {error}"
│       └─► Continue to API fallback ↓
│
├─► Else (CLI not authenticated):
│   └─► Log: "Claude CLI not available, using direct API"
│
├─► API Fallback Path:
│   │
│   ├─► Check if apiKey provided
│   │   ├─► NO  → Log error → return [] ❌
│   │   └─► YES → continue
│   │
│   ├─► extractWithApi(conversationChunk, systemPrompt, apiKey)
│   │   │
│   │   ├─► fetch('https://api.anthropic.com/v1/messages', {...})
│   │   │   │
│   │   │   ├─► response.ok → Parse JSON → return { success: true, memories: [...] }
│   │   │   └─► !response.ok → return { success: false, error: '...' }
│   │   │
│   │   └─► Return result
│   │
│   ├─► If result.success:
│   │   ├─► Log: "API extraction successful: X memories found"
│   │   └─► RETURN memories array ✅
│   │
│   └─► If !result.success:
│       ├─► Log: "Both CLI and API extraction failed: {error}"
│       └─► RETURN [] ❌
│
└─► End
```

## Success Scenarios

### Scenario 1: CLI Available and Authenticated ✅

```
User calls extractMemoriesFromChunk()
    │
    ├─► CLI check: ✅ Available & Authenticated
    │
    ├─► Extract with CLI
    │       │
    │       └─► Success: 3 memories extracted
    │
    └─► Return [memory1, memory2, memory3]

Console Output:
  "Using Claude CLI for memory extraction"
  "CLI extraction successful: 3 memories found"
```

### Scenario 2: CLI Unavailable, API Available ✅

```
User calls extractMemoriesFromChunk(chunk, 'api-key-xxx')
    │
    ├─► CLI check: ❌ Not Available
    │
    ├─► Skip CLI extraction
    │
    ├─► Extract with API
    │       │
    │       └─► Success: 2 memories extracted
    │
    └─► Return [memory1, memory2]

Console Output:
  "Claude CLI not available, using direct API"
  "API extraction successful: 2 memories found"
```

### Scenario 3: CLI Fails, API Succeeds ✅

```
User calls extractMemoriesFromChunk(chunk, 'api-key-xxx')
    │
    ├─► CLI check: ✅ Available & Authenticated
    │
    ├─► Extract with CLI
    │       │
    │       └─► Failure: Connection timeout
    │
    ├─► Extract with API (fallback)
    │       │
    │       └─► Success: 1 memory extracted
    │
    └─► Return [memory1]

Console Output:
  "Using Claude CLI for memory extraction"
  "CLI extraction failed, falling back to API: Connection timeout"
  "API extraction successful: 1 memories found"
```

## Failure Scenarios

### Scenario 4: Both CLI and API Fail ❌

```
User calls extractMemoriesFromChunk(chunk, 'invalid-key')
    │
    ├─► CLI check: ✅ Available & Authenticated
    │
    ├─► Extract with CLI
    │       │
    │       └─► Failure: Rate limit exceeded
    │
    ├─► Extract with API (fallback)
    │       │
    │       └─► Failure: Invalid API key
    │
    └─► Return []

Console Output:
  "Using Claude CLI for memory extraction"
  "CLI extraction failed, falling back to API: Rate limit exceeded"
  "Both CLI and API extraction failed: Invalid API key"
```

### Scenario 5: No API Key and CLI Unavailable ❌

```
User calls extractMemoriesFromChunk(chunk, null)
    │
    ├─► CLI check: ❌ Not Available
    │
    ├─► Skip CLI extraction
    │
    ├─► Check for API key: ❌ Not provided
    │
    └─► Return []

Console Output:
  "Claude CLI not available, using direct API"
  "No API key provided and CLI unavailable"
```

## Method Return Values

### checkCliAvailability()

```javascript
// CLI Available & Authenticated
{
  available: true,
  authenticated: true,
  method: 'cli'
}

// CLI Available but Not Authenticated
{
  available: true,
  authenticated: false,
  method: 'none'
}

// CLI Not Available
{
  available: false,
  authenticated: false,
  method: 'none'
}
```

### extractWithCli() / extractWithApi()

```javascript
// Success
{
  success: true,
  memories: [
    {
      type: 'decision',
      category: 'architecture',
      title: 'Chose React for frontend',
      content: '...',
      source_chunk: '...',
      related_entities: [],
      confidence_score: 85,
      reasoning: '...'
    },
    // ... more memories
  ],
  method: 'cli' // or 'api'
}

// Failure
{
  success: false,
  memories: [],
  method: 'cli', // or 'api'
  error: 'Connection timeout' // Error description
}
```

## State Diagram

```
┌─────────────┐
│   START     │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Check CLI Available │
└──────┬──────┬───────┘
       │      │
   YES │      │ NO
       │      │
       ▼      ▼
┌──────────┐ ┌──────────┐
│Try CLI   │ │Try API   │
│Extraction│ │Extraction│
└─┬──────┬─┘ └─┬──────┬─┘
  │      │     │      │
  │ OK   │FAIL │  OK  │FAIL
  │      │     │      │
  ▼      │     ▼      ▼
┌──────┐ │   ┌──────────┐
│Return│ │   │Return [] │
│Array │ │   │(Empty)   │
└──────┘ │   └──────────┘
         │
         ▼
    ┌──────────┐
    │Try API   │
    │(Fallback)│
    └─┬──────┬─┘
      │      │
      │  OK  │FAIL
      │      │
      ▼      ▼
    ┌──────┐ ┌──────────┐
    │Return│ │Return [] │
    │Array │ │(Empty)   │
    └──────┘ └──────────┘
```

## Component Interaction

```
┌──────────────────────────────────────────────────────────┐
│                 React Component                          │
│  (Memory Lane, Admin, etc.)                              │
└───────────────────────┬──────────────────────────────────┘
                        │
                        │ extractMemoriesFromChunk(chunk, apiKey)
                        ▼
┌──────────────────────────────────────────────────────────┐
│          memoryExtractionService.js                      │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  checkCliAvailability()                            │ │
│  └───────────────────┬────────────────────────────────┘ │
│                      │                                   │
│                      ▼                                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │  window.electronAPI.claudeCli                      │ │
│  │    ├─ check()                                      │ │
│  │    └─ checkOAuth()                                 │ │
│  └───────────────────┬────────────────────────────────┘ │
│                      │                                   │
│                      ▼                                   │
│  ┌────────────────────────────────────────────────────┐ │
│  │  extractWithCli() OR extractWithApi()              │ │
│  └────────────────────────────────────────────────────┘ │
└───────────────────────┬──────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
┌─────────────────┐           ┌─────────────────────┐
│ Electron IPC    │           │  Direct HTTP        │
│ └─ Main Process │           │  └─ Fetch API       │
│   └─ Claude CLI │           │    └─ Anthropic API │
└─────────────────┘           └─────────────────────┘
```

## Logging Flow

```
extractMemoriesFromChunk() called
    │
    ├─► CLI Available?
    │   ├─► YES → console.log("Using Claude CLI for memory extraction")
    │   └─► NO  → console.log("Claude CLI not available, using direct API")
    │
    ├─► CLI Extraction
    │   ├─► Success → console.log("CLI extraction successful: X memories found")
    │   └─► Failure → console.warn("CLI extraction failed, falling back to API: {error}")
    │
    ├─► API Extraction
    │   ├─► Success → console.log("API extraction successful: X memories found")
    │   └─► Failure → console.error("Both CLI and API extraction failed: {error}")
    │
    └─► No API Key
        └─► console.error("No API key provided and CLI unavailable")
```

## Testing Paths

```
Test Matrix:
─────────────────────────────────────────────────────────────
│ CLI State      │ API Key  │ Expected Path               │
─────────────────────────────────────────────────────────────
│ Authenticated  │ Present  │ CLI → Success ✅            │
│ Authenticated  │ Missing  │ CLI → Success ✅            │
│ Not Auth       │ Present  │ API → Success ✅            │
│ Not Auth       │ Missing  │ Error ❌                    │
│ Not Available  │ Present  │ API → Success ✅            │
│ Not Available  │ Missing  │ Error ❌                    │
│ CLI Fails      │ Present  │ CLI → Fail → API → Success ✅│
│ CLI Fails      │ Missing  │ CLI → Fail → Error ❌       │
│ Both Fail      │ Present  │ CLI → Fail → API → Fail ❌  │
─────────────────────────────────────────────────────────────
```

## Performance Considerations

```
Typical Execution Times:

CLI Path (Authenticated):
  ├─ CLI Check:        ~10ms
  ├─ OAuth Check:      ~5ms
  ├─ Query Execution:  ~1-2s (depends on prompt)
  └─ Total:            ~1.2-2.0s

API Path (Fallback):
  ├─ Fetch Request:    ~1-3s (depends on network)
  ├─ Response Parse:   ~5ms
  └─ Total:            ~1.0-3.0s

CLI Fail → API Fallback:
  ├─ CLI Attempt:      ~1-2s (until timeout)
  ├─ API Attempt:      ~1-3s
  └─ Total:            ~2-5s (worst case)
```
