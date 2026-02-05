/**
 * Prompt Crafter - Ollama Refinement Service
 *
 * Handles all Ollama API interactions for refining prompts.
 * Uses local Ollama models only - no cloud APIs.
 */

import { PROMPT_CATEGORIES, REFINEMENT_OPTIONS } from './promptCategories.js';

/**
 * System prompt for the Ollama model that refines prompts.
 * Instructs the model to transform rough intents into effective Claude Code prompts.
 */
const REFINEMENT_SYSTEM_PROMPT = `You transform rough prompt ideas into effective Claude Code prompts.

Rules:
- BE SPECIFIC: Include file names, function names, line numbers when relevant
- PROVIDE CONTEXT: Reference existing code patterns, project structure
- SET CONSTRAINTS: Clarify what should NOT be changed
- DEFINE SUCCESS: Describe the expected outcome
- STAY FOCUSED: One clear task per prompt

CRITICAL OUTPUT RULES:
- Output ONLY the refined prompt itself
- Do NOT include any preamble like "Here's the refined prompt:" or "Based on your intent:"
- Do NOT include any explanation before or after the prompt
- Do NOT use markdown formatting or code blocks
- Start your response directly with the prompt text
- End your response with the last word of the prompt

Example of WRONG output:
"Here's a refined prompt based on your intent: Fix the bug in login.js"

Example of CORRECT output:
"Fix the bug in login.js"

Just the prompt. Nothing else.`;

/**
 * Refine a prompt using Ollama's local LLM.
 *
 * @param {Object} options - Refinement options
 * @param {string} options.intent - The user's rough prompt idea
 * @param {string} options.category - Category ID from PROMPT_CATEGORIES
 * @param {string[]} options.selectedRefinements - Array of refinement option IDs
 * @param {string[]} options.contextFiles - File paths to include as context
 * @param {string[]} options.codeSnippets - Code snippets to include
 * @param {string} options.errorMessage - Optional error message
 * @param {string} options.model - Ollama model name (default: 'mistral')
 * @param {string} options.ollamaUrl - Ollama API URL (default: 'http://localhost:11434')
 * @returns {Promise<{success: boolean, refinedPrompt?: string, model?: string, error?: string}>}
 */
export async function refinePrompt(options) {
  const {
    intent,
    category,
    selectedRefinements = [],
    contextFiles = [],
    codeSnippets = [],
    errorMessage = '',
    model = 'mistral',
    ollamaUrl = 'http://localhost:11434'
  } = options;

  // Validate inputs
  if (!intent || !intent.trim()) {
    return {
      success: false,
      error: 'Intent is required'
    };
  }

  if (!category || !PROMPT_CATEGORIES[category]) {
    return {
      success: false,
      error: 'Invalid category'
    };
  }

  // Build the refinement request
  const categoryInfo = PROMPT_CATEGORIES[category];

  // Start building user prompt
  let userPrompt = `CATEGORY: ${categoryInfo.name}
ORIGINAL INTENT: ${intent}

REFINEMENT REQUESTS:
${selectedRefinements.map(r => {
    const option = REFINEMENT_OPTIONS[r];
    return option ? `- ${option.prompt}` : '';
  }).filter(Boolean).join('\n')}`;

  // Add context sections if provided
  if (contextFiles.length > 0) {
    userPrompt += `\n\nRELEVANT FILES:\n${contextFiles.join('\n')}`;
  }

  if (codeSnippets.length > 0) {
    userPrompt += `\n\nCODE CONTEXT:\n${codeSnippets.join('\n\n')}`;
  }

  if (errorMessage) {
    userPrompt += `\n\nERROR MESSAGE:\n${errorMessage}`;
  }

  userPrompt += '\n\nOutput the refined prompt only. No preamble, no explanation.';

  try {
    // Call Ollama API
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: REFINEMENT_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 500
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const refinedPrompt = data.message?.content?.trim() || '';

    if (!refinedPrompt) {
      throw new Error('Ollama returned empty response');
    }

    return {
      success: true,
      refinedPrompt,
      model
    };
  } catch (error) {
    console.error('Prompt refinement error:', error);
    return {
      success: false,
      error: error.message || 'Failed to refine prompt'
    };
  }
}

/**
 * Check if Ollama is running and get available models.
 *
 * @param {string} ollamaUrl - Ollama API URL (default: 'http://localhost:11434')
 * @returns {Promise<{available: boolean, models: string[], error?: string}>}
 */
export async function checkOllamaModels(ollamaUrl = 'http://localhost:11434') {
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json();
    const models = data.models?.map(m => m.name) || [];

    return {
      available: true,
      models
    };
  } catch (error) {
    console.error('Ollama check error:', error);
    return {
      available: false,
      models: [],
      error: error.message || 'Failed to connect to Ollama'
    };
  }
}
