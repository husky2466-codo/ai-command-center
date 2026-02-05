/**
 * Chain Runner Helpers
 * Utility functions adapted from frontend Chain Runner modules for Node.js backend
 */

const logger = require('../utils/logger.cjs');

// =========================================================================
// PROMPT GENERATION
// =========================================================================

const RAG_CATEGORIES = [
  { id: 'general', label: 'General Knowledge', description: 'Broad topics and general information' },
  { id: 'equipment_guides', label: 'Equipment Guides', description: 'Setup, operation, and maintenance of AV equipment' },
  { id: 'event_types', label: 'Event Types', description: 'Different event formats and their AV requirements' },
  { id: 'venue_considerations', label: 'Venue Considerations', description: 'Venue-specific technical requirements and challenges' },
  { id: 'common_mistakes', label: 'Common Mistakes', description: 'Frequent errors and how to avoid them' },
  { id: 'troubleshooting', label: 'Troubleshooting', description: 'Problem diagnosis and solutions' }
];

/**
 * Build system prompt for AI-powered prompt generation
 */
function buildGeneratorSystemPrompt(topic, category, existingTopics, count) {
  const categoryInfo = RAG_CATEGORIES.find(c => c.id === category);
  const categoryLabel = categoryInfo?.label || category;
  const categoryDesc = categoryInfo?.description || '';

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
async function generatePrompts(options) {
  const { topic, category, count, provider, apiKey, model, existingTopics = [], ollamaUrl = 'http://localhost:11434' } = options;

  if (provider !== 'ollama' && !apiKey) {
    return { success: false, error: 'API key not provided' };
  }

  const systemPrompt = buildGeneratorSystemPrompt(topic, category, existingTopics, count);

  try {
    let response;
    let promptsText = '';

    if (provider === 'anthropic') {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model || 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{ role: 'user', content: systemPrompt }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Anthropic API error: ${response.status} - ${errorText}` };
      }

      const data = await response.json();
      promptsText = data.content?.[0]?.text || '';

    } else if (provider === 'openai') {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are a training data generator. Follow instructions precisely and return valid JSON.' },
            { role: 'user', content: systemPrompt }
          ],
          temperature: 0.8,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `OpenAI API error: ${response.status} - ${errorText}` };
      }

      const data = await response.json();
      promptsText = data.choices?.[0]?.message?.content || '';

    } else if (provider === 'ollama') {
      response = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'mistral',
          messages: [
            { role: 'system', content: 'You are a training data generator. Follow instructions precisely and return valid JSON.' },
            { role: 'user', content: systemPrompt }
          ],
          stream: false
        })
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

    // Parse JSON array from response
    let jsonText = promptsText.trim();

    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let prompts;
    try {
      prompts = JSON.parse(jsonText);
    } catch (parseError) {
      const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        prompts = JSON.parse(arrayMatch[0]);
      } else {
        return { success: false, error: `Failed to parse JSON response: ${parseError.message}`, rawResponse: promptsText };
      }
    }

    if (!Array.isArray(prompts)) {
      return { success: false, error: 'Response is not an array', rawResponse: promptsText };
    }

    if (prompts.some(p => typeof p !== 'string')) {
      return { success: false, error: 'Array contains non-string elements', rawResponse: promptsText };
    }

    logger.info('Generated prompts', { count: prompts.length, topic });

    return { success: true, prompts, count: prompts.length };

  } catch (error) {
    logger.error('generatePrompts error', { error: error.message });
    return { success: false, error: error.message };
  }
}

// =========================================================================
// RAG EXPORT
// =========================================================================

/**
 * Generate UUID v4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Parse chain outputs into Q&A pairs
 */
function parseChainOutputs(sessionLog) {
  const { outputs, agents, prompt } = sessionLog;
  const pairs = [];

  if (!outputs || outputs.length === 0) {
    return pairs;
  }

  const maxAgentIndex = Math.max(...outputs.map(o => o.agentIndex || 0));
  const agentCount = agents?.length || maxAgentIndex + 1;

  // Group outputs by iteration
  const iterations = {};
  outputs.forEach((output) => {
    const iter = output.iteration || 1;
    if (!iterations[iter]) {
      iterations[iter] = [];
    }
    iterations[iter].push(output);
  });

  // Process each iteration
  Object.entries(iterations).forEach(([iterNum, iterOutputs]) => {
    iterOutputs.sort((a, b) => a.agentIndex - b.agentIndex);

    let question = '';
    let answer = '';
    let review = '';
    let context = prompt;

    if (agentCount >= 2) {
      const agent0Output = iterOutputs.find((o) => o.agentIndex === 0);
      const agent1Output = iterOutputs.find((o) => o.agentIndex === 1);

      if (agent0Output && agent1Output) {
        const agent0Spec = agents?.[0]?.taskSpec?.toLowerCase() || '';

        if (agent0Spec.includes('question') || agent0Spec.includes('generate')) {
          question = agent0Output.output;
          context = agent0Output.input;
        } else {
          question = agent0Output.input;
          context = '';
        }
        answer = agent1Output.output;
      }

      if (agentCount >= 3) {
        const agent2Output = iterOutputs.find((o) => o.agentIndex === 2);
        if (agent2Output) {
          review = agent2Output.output;
        }
      }
    } else if (agentCount === 1) {
      const agent0Output = iterOutputs.find((o) => o.agentIndex === 0);
      if (agent0Output) {
        question = agent0Output.input;
        answer = agent0Output.output;
        context = '';
      }
    }

    if (question && answer) {
      pairs.push({
        id: generateUUID(),
        context: context?.trim() || '',
        question: question.trim(),
        answer: answer.trim(),
        review: review?.trim() || '',
        timestamp: iterOutputs[0]?.timestamp || new Date().toISOString(),
        qualityScore: iterOutputs[iterOutputs.length - 1]?.qualityScore || null,
      });
    }
  });

  return pairs;
}

/**
 * Format Q&A pairs as JSONL
 */
function formatAsJSONL(pairs, settings) {
  const { category, tags } = settings;

  return pairs
    .map((pair) => {
      const record = {
        id: pair.id,
        category,
        context: pair.context,
        question: pair.question,
        answer: pair.answer,
        source: 'chain-runner-api',
        timestamp: pair.timestamp,
        tags: tags || [],
        quality_score: pair.qualityScore?.overall || null,
        quality_details: pair.qualityScore || null,
      };

      if (pair.review) {
        record.review = pair.review;
      }

      return JSON.stringify(record);
    })
    .join('\n');
}

/**
 * Format Q&A pairs as Markdown
 */
function formatAsMarkdown(pairs, settings) {
  const { category, tags } = settings;
  const now = new Date().toISOString().split('T')[0];

  let md = `# RAG Training Document\n`;
  md += `Generated: ${now}\n`;
  md += `Category: ${category}\n`;
  md += `Tags: ${tags?.join(', ') || 'none'}\n\n`;
  md += `---\n\n`;

  pairs.forEach((pair, index) => {
    md += `## Example ${index + 1}\n\n`;

    if (pair.context) {
      md += `**Context:** ${pair.context}\n\n`;
    }

    md += `**Question:** ${pair.question}\n\n`;
    md += `**Answer:** ${pair.answer}\n\n`;

    if (pair.review) {
      md += `**Review Notes:** ${pair.review}\n\n`;
    }

    if (pair.qualityScore) {
      md += `**Quality Score:** ${(pair.qualityScore.overall * 100).toFixed(0)}%\n`;
      md += `- Correctness: ${(pair.qualityScore.correctness * 100).toFixed(0)}%\n`;
      md += `- Completeness: ${(pair.qualityScore.completeness * 100).toFixed(0)}%\n`;
      md += `- Clarity: ${(pair.qualityScore.clarity * 100).toFixed(0)}%\n`;
      md += `- Relevance: ${(pair.qualityScore.relevance * 100).toFixed(0)}%\n\n`;
    }

    md += `**Tags:** ${tags?.join(', ') || 'none'}\n\n`;
    md += `---\n\n`;
  });

  return md;
}

/**
 * Format Q&A pairs as plain text
 */
function formatAsText(pairs, settings) {
  return pairs
    .map((pair) => {
      let text = '';

      if (pair.context) {
        text += `Context: ${pair.context}\n`;
      }

      text += `Q: ${pair.question}\n`;
      text += `A: ${pair.answer}`;

      if (pair.review) {
        text += `\nReview: ${pair.review}`;
      }

      if (pair.qualityScore) {
        text += `\nQuality: ${(pair.qualityScore.overall * 100).toFixed(0)}%`;
      }

      return text;
    })
    .join('\n---\n');
}

module.exports = {
  generatePrompts,
  buildGeneratorSystemPrompt,
  parseChainOutputs,
  formatAsJSONL,
  formatAsMarkdown,
  formatAsText,
  generateUUID,
  RAG_CATEGORIES
};
