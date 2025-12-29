import { RAG_CATEGORIES } from './ragConstants';

/**
 * Load existing RAG topics from all JSONL files in rag-outputs folder
 * Returns array of unique questions to avoid duplicates
 */
export async function loadExistingRAGTopics(electronAPI) {
  try {
    const userDataPath = await electronAPI.getUserDataPath();
    const ragOutputsDir = `${userDataPath}\\rag-outputs`;

    // Check if directory exists
    const dirExists = await electronAPI.fileExists(ragOutputsDir);
    if (!dirExists) {
      console.log('[Prompt Generator] rag-outputs directory does not exist yet');
      return { success: true, questions: [] };
    }

    // List all files in rag-outputs
    const listResult = await electronAPI.listDirectory(ragOutputsDir);
    if (!listResult.success) {
      console.warn('[Prompt Generator] Failed to list rag-outputs:', listResult.error);
      return { success: true, questions: [] };
    }

    // Filter for .jsonl files
    const jsonlFiles = listResult.files.filter(f => f.endsWith('.jsonl'));
    console.log(`[Prompt Generator] Found ${jsonlFiles.length} JSONL files`);

    const allQuestions = [];

    // Read and parse each JSONL file
    for (const filename of jsonlFiles) {
      const filePath = `${ragOutputsDir}\\${filename}`;
      const readResult = await electronAPI.readFile(filePath);

      if (readResult.success) {
        // Parse JSONL (one JSON object per line)
        const lines = readResult.content.trim().split('\n');
        for (const line of lines) {
          try {
            const record = JSON.parse(line);
            if (record.question) {
              allQuestions.push(record.question.trim());
            }
          } catch (parseError) {
            console.warn('[Prompt Generator] Failed to parse JSONL line:', parseError.message);
          }
        }
      }
    }

    // Remove duplicates
    const uniqueQuestions = [...new Set(allQuestions)];
    console.log(`[Prompt Generator] Loaded ${uniqueQuestions.length} unique questions from ${jsonlFiles.length} files`);

    return { success: true, questions: uniqueQuestions };
  } catch (error) {
    console.error('[Prompt Generator] Error loading existing topics:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Build system prompt for prompt generation
 */
export function buildGeneratorSystemPrompt(topic, category, existingTopics, count) {
  const categoryInfo = RAG_CATEGORIES.find(c => c.id === category);
  const categoryLabel = categoryInfo?.label || category;
  const categoryDesc = categoryInfo?.description || '';

  // Take first 50 existing questions to show as examples of what to avoid
  const existingExamples = existingTopics.slice(0, 50);

  let prompt = `You are a training data generator for an AI audio/visual assistant. Your task is to generate ${count} unique, high-quality prompts for RAG (Retrieval-Augmented Generation) training.

**Topic:** ${topic}
**Category:** ${categoryLabel} - ${categoryDesc}

**Instructions:**
1. Generate exactly ${count} unique prompts that would be suitable questions for someone learning about "${topic}"
2. Each prompt should be clear, specific, and focused on practical knowledge
3. Vary the style and depth: include beginner, intermediate, and advanced questions
4. Focus on "how-to", "what is", "when to use", "troubleshooting", and "best practices" questions
5. Each prompt should stand alone - don't reference previous prompts

**IMPORTANT - Avoid Duplicates:**
${existingExamples.length > 0 ? `The following ${existingExamples.length} questions already exist. DO NOT generate similar questions:\n\n${existingExamples.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n` : 'No existing questions found - you can start fresh.\n'}

**Output Format:**
Return ONLY a JSON array of strings. Each string is one prompt. No additional text, markdown formatting, or explanations.

Example output format:
["What is the difference between...", "How do you configure...", "When should you use..."]

Generate the ${count} prompts now:`;

  return prompt;
}

/**
 * Generate prompts using AI API
 */
export async function generatePrompts(options) {
  const { topic, category, count, provider, apiKey, model, existingTopics = [] } = options;

  // Ollama doesn't require an API key (runs locally)
  if (provider !== 'ollama' && !apiKey) {
    return { success: false, error: 'API key not provided' };
  }

  // Build the system prompt
  const systemPrompt = buildGeneratorSystemPrompt(topic, category, existingTopics, count);

  try {
    let response;
    let promptsText = '';

    if (provider === 'anthropic') {
      // Anthropic API call
      const requestBody = {
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: systemPrompt
          }
        ]
      };

      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Anthropic API error: ${response.status} - ${errorText}` };
      }

      const data = await response.json();
      promptsText = data.content?.[0]?.text || '';

    } else if (provider === 'openai') {
      // OpenAI API call
      const requestBody = {
        model: model || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a training data generator. Follow instructions precisely and return valid JSON.'
          },
          {
            role: 'user',
            content: systemPrompt
          }
        ],
        temperature: 0.8,
        max_tokens: 4000
      };

      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `OpenAI API error: ${response.status} - ${errorText}` };
      }

      const data = await response.json();
      promptsText = data.choices?.[0]?.message?.content || '';

    } else if (provider === 'ollama') {
      // Ollama API call
      const requestBody = {
        model: model || 'mistral',
        messages: [
          {
            role: 'system',
            content: 'You are a training data generator. Follow instructions precisely and return valid JSON.'
          },
          {
            role: 'user',
            content: systemPrompt
          }
        ],
        stream: false
      };

      response = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Ollama API error: ${response.status} - ${errorText}` };
      }

      const data = await response.json();
      promptsText = data.message?.content || '';

    } else {
      return { success: false, error: `Unsupported provider: ${provider}` };
    }

    // Parse the JSON array from the response
    // Handle potential markdown code blocks
    let jsonText = promptsText.trim();

    // Remove markdown code fences if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Try to parse the JSON
    let prompts;
    try {
      prompts = JSON.parse(jsonText);
    } catch (parseError) {
      // If direct parse fails, try to extract JSON array from the text
      const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        prompts = JSON.parse(arrayMatch[0]);
      } else {
        return {
          success: false,
          error: `Failed to parse JSON response: ${parseError.message}`,
          rawResponse: promptsText
        };
      }
    }

    // Validate that we got an array of strings
    if (!Array.isArray(prompts)) {
      return { success: false, error: 'Response is not an array', rawResponse: promptsText };
    }

    if (prompts.some(p => typeof p !== 'string')) {
      return { success: false, error: 'Array contains non-string elements', rawResponse: promptsText };
    }

    console.log(`[Prompt Generator] Successfully generated ${prompts.length} prompts`);

    return {
      success: true,
      prompts,
      count: prompts.length
    };

  } catch (error) {
    console.error('[Prompt Generator] Error generating prompts:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save prompt list to file
 */
export async function savePromptList(promptList, topic, electronAPI) {
  try {
    const userDataPath = await electronAPI.getUserDataPath();
    const promptListsDir = `${userDataPath}\\prompt-lists`;

    // Create timestamp for filename
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);

    // Sanitize topic for filename (remove special chars)
    const safeTopic = topic.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `prompts_${safeTopic}_${timestamp}.json`;
    const filePath = `${promptListsDir}\\${filename}`;

    // Prepare data structure
    const data = {
      topic,
      timestamp: new Date().toISOString(),
      count: promptList.length,
      prompts: promptList,
      metadata: {
        generator: 'chain-runner',
        version: '1.0'
      }
    };

    // Write file
    const result = await electronAPI.writeFile(filePath, JSON.stringify(data, null, 2));

    if (result.success) {
      console.log(`[Prompt Generator] Saved ${promptList.length} prompts to ${filename}`);
      return {
        success: true,
        filePath,
        filename,
        count: promptList.length
      };
    } else {
      return { success: false, error: result.error || 'Failed to write file' };
    }
  } catch (error) {
    console.error('[Prompt Generator] Error saving prompt list:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load the most recent prompt list
 */
export async function loadPromptList(electronAPI) {
  try {
    const userDataPath = await electronAPI.getUserDataPath();
    const promptListsDir = `${userDataPath}\\prompt-lists`;

    // Check if directory exists
    const dirExists = await electronAPI.fileExists(promptListsDir);
    if (!dirExists) {
      console.log('[Prompt Generator] prompt-lists directory does not exist yet');
      return { success: false, error: 'No prompt lists found' };
    }

    // List all files
    const listResult = await electronAPI.listDirectory(promptListsDir);
    if (!listResult.success) {
      return { success: false, error: listResult.error };
    }

    // Filter for .json files and sort by name (which includes timestamp)
    const jsonFiles = listResult.files
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse(); // Most recent first

    if (jsonFiles.length === 0) {
      return { success: false, error: 'No prompt list files found' };
    }

    // Load the most recent file
    const mostRecentFile = jsonFiles[0];
    const filePath = `${promptListsDir}\\${mostRecentFile}`;

    const readResult = await electronAPI.readFile(filePath);
    if (!readResult.success) {
      return { success: false, error: readResult.error };
    }

    // Parse JSON
    try {
      const data = JSON.parse(readResult.content);
      console.log(`[Prompt Generator] Loaded ${data.count} prompts from ${mostRecentFile}`);

      return {
        success: true,
        data,
        filename: mostRecentFile,
        filePath
      };
    } catch (parseError) {
      return { success: false, error: `Failed to parse JSON: ${parseError.message}` };
    }

  } catch (error) {
    console.error('[Prompt Generator] Error loading prompt list:', error);
    return { success: false, error: error.message };
  }
}
