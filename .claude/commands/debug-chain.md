Debug the Chain Runner app.

Check these in order:
1. Read `src/components/chain-runner/ChainRunner.jsx`
2. Identify which provider/model is failing
3. Check the `callApi` function for the specific provider
4. Verify API keys are present (check apiKeys prop)
5. Look at session logs in `%APPDATA%\ai-command-center\sessions\`

Provider-specific checks:
- Anthropic: Needs `anthropic-dangerous-direct-browser-access` header
- OpenAI: Bearer token format
- Ollama: Must be running locally on port 11434
- HuggingFace: Uses router.huggingface.co endpoint
