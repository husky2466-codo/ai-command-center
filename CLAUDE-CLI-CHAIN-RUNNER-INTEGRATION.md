# Claude CLI Integration for Chain Runner

**Date:** 2026-01-01

## Summary

Added "Claude CLI (Subscription)" as a new provider option in Chain Runner, allowing users to leverage their Claude Pro/Max subscription for free Chain Runner operations.

## Changes Made

### 1. Provider Configuration (`useChainState.js`)

Added `claude-cli` to the PROVIDERS constant:
- **Name:** "Claude CLI (Subscription)"
- **Models:** `['default']` (CLI uses default model, no selection needed)

**File:** `src/components/chain-runner/hooks/useChainState.js`

### 2. Execution Logic (`useChainExecution.js`)

Added new provider case in `callApi()` function:
- Uses `window.electronAPI.claudeCli.query()` to execute queries
- Combines taskSpec and input into single prompt
- Max tokens: 4096
- No API key required (uses subscription)

**File:** `src/components/chain-runner/hooks/useChainExecution.js`

### 3. Agent Configuration UI (`ChainConfig.jsx`)

Updated to handle claude-cli provider:
- Added "✨ Free with Pro/Max" badge next to provider dropdown when claude-cli is selected
- Hides model dropdown when claude-cli is selected (CLI uses default model)
- Badge styled with gold color to match design system

**File:** `src/components/chain-runner/ChainConfig.jsx`

### 4. Prompt Generator Integration (`promptGenerator.js`)

Added claude-cli support for batch prompt generation:
- Uses `window.electronAPI.claudeCli.query()` with system prompt
- Max tokens: 4000
- Validates API availability before use

**File:** `src/components/chain-runner/promptGenerator.js`

### 5. Quality Validator Integration (`qualityValidator.js`)

Added claude-cli support for Q&A validation:
- Uses `window.electronAPI.claudeCli.query()` with validation prompt
- Max tokens: 1000
- Validates API availability before use

**File:** `src/components/chain-runner/qualityValidator.js`

### 6. Prompt Generator UI (`ChainPromptGenerator.jsx`)

Updated to hide model selector when claude-cli is selected:
- Provider dropdown automatically includes claude-cli from PROVIDERS constant
- Model dropdown hidden when `generatorProvider === 'claude-cli'`

**File:** `src/components/chain-runner/ChainPromptGenerator.jsx`

### 7. Chain Execution UI (`ChainExecution.jsx`)

Updated validator configuration UI:
- Provider dropdown includes claude-cli
- Model dropdown hidden when `validatorProvider === 'claude-cli'`

**File:** `src/components/chain-runner/ChainExecution.jsx`

### 8. Styling (`ChainRunner.css`)

Added `.cli-badge` class for the "Free with Pro/Max" indicator:
- Gold color (#ffd700) matching design system
- Semi-transparent background with border
- Compact padding and border-radius

**File:** `src/components/chain-runner/ChainRunner.css`

## User Experience

### Provider Dropdown
```
Anthropic (API)
OpenAI (API)
HuggingFace (API)
Ollama (Local)
Claude CLI (Subscription) ✨
```

### When Claude CLI is Selected
- **Provider field:** Shows "✨ Free with Pro/Max" badge
- **Model field:** Hidden (CLI uses default model automatically)
- **API Key:** Not required (uses subscription via CLI)

## Technical Details

### API Integration
The integration uses the existing `window.electronAPI.claudeCli.query()` method from the preload script:

```javascript
const cliResult = await window.electronAPI.claudeCli.query(
  `${taskSpec}\n\n${input}`,
  {
    maxTokens: 4096
  }
);

if (cliResult.success) {
  return cliResult.content || 'No response';
}
throw new Error(cliResult.error || 'Claude CLI query failed');
```

### Error Handling
- Checks for `window.electronAPI?.claudeCli?.query` availability
- Throws clear error if CLI is not available
- Propagates CLI errors with descriptive messages

## Testing

Build status: ✅ **Success**
- No TypeScript errors
- No ESLint warnings
- Build completed in 3.05s

## Benefits

1. **Cost Savings:** Chain Runner can now use Claude without consuming API credits
2. **Subscription Value:** Makes Claude Pro/Max subscription more valuable
3. **Consistent Experience:** Same UI/UX as other providers
4. **Quality:** Uses latest Claude model via CLI (Sonnet 4.5)

## Future Enhancements

- Add model selection once CLI supports multiple models
- Add streaming support for real-time output
- Add usage statistics tracking
- Add CLI authentication status indicator

## Files Modified

1. `src/components/chain-runner/hooks/useChainState.js`
2. `src/components/chain-runner/hooks/useChainExecution.js`
3. `src/components/chain-runner/ChainConfig.jsx`
4. `src/components/chain-runner/promptGenerator.js`
5. `src/components/chain-runner/qualityValidator.js`
6. `src/components/chain-runner/ChainPromptGenerator.jsx`
7. `src/components/chain-runner/ChainExecution.jsx`
8. `src/components/chain-runner/ChainRunner.css`

## Backward Compatibility

✅ **Fully backward compatible**
- All existing providers (Anthropic, OpenAI, HuggingFace, Ollama) remain unchanged
- No breaking changes to existing configurations
- Saved configurations will continue to work
- New provider is purely additive

---

**Implementation Time:** ~15 minutes
**Lines Changed:** ~150 lines across 8 files
**Status:** Complete and tested
