import { EXPORT_FORMATS } from './ragConstants';

/**
 * Generate a UUID v4
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Parse chain outputs into Q&A pairs
 * Handles different chain configurations:
 * - 2 agents: Agent 1 = Question, Agent 2 = Answer
 * - 3 agents: Agent 1 = Question, Agent 2 = Answer, Agent 3 = Review/Validation
 * - Multi-iteration: Each iteration produces one Q&A pair
 */
export function parseChainOutputs(sessionLog) {
  console.log('[RAG Parser] Starting parse with sessionLog:', sessionLog);

  const { outputs, agents, prompt } = sessionLog;
  const pairs = [];

  if (!outputs || outputs.length === 0) {
    console.log('[RAG Parser] No outputs found');
    return pairs;
  }

  console.log(`[RAG Parser] Found ${outputs.length} outputs`);

  // Determine agent count from outputs if agents array is not available
  const maxAgentIndex = Math.max(...outputs.map(o => o.agentIndex || 0));
  const agentCount = agents?.length || maxAgentIndex + 1;

  console.log(`[RAG Parser] Agent count: ${agentCount} (from ${agents?.length ? 'agents array' : 'output agentIndex'})`);

  // Group outputs by iteration
  const iterations = {};
  outputs.forEach((output) => {
    const iter = output.iteration || 1;
    if (!iterations[iter]) {
      iterations[iter] = [];
    }
    iterations[iter].push(output);
  });

  console.log(`[RAG Parser] Grouped into ${Object.keys(iterations).length} iterations`);

  // Process each iteration
  Object.entries(iterations).forEach(([iterNum, iterOutputs]) => {
    // Sort by agent index
    iterOutputs.sort((a, b) => a.agentIndex - b.agentIndex);

    console.log(`[RAG Parser] Processing iteration ${iterNum} with ${iterOutputs.length} outputs`);

    let question = '';
    let answer = '';
    let review = '';
    let context = prompt;

    if (agentCount >= 2) {
      const agent0Output = iterOutputs.find((o) => o.agentIndex === 0);
      const agent1Output = iterOutputs.find((o) => o.agentIndex === 1);

      console.log('[RAG Parser] 2+ agent mode:', {
        hasAgent0: !!agent0Output,
        hasAgent1: !!agent1Output
      });

      if (agent0Output && agent1Output) {
        // Determine if Agent 0 generates questions or just forwards context
        const agent0Spec = agents?.[0]?.taskSpec?.toLowerCase() || '';

        if (agent0Spec.includes('question') || agent0Spec.includes('generate')) {
          // Agent 0 generates questions
          question = agent0Output.output;
          context = agent0Output.input;
          console.log('[RAG Parser] Agent 0 generates questions');
        } else {
          // Agent 0 forwards input, so first input is the question
          question = agent0Output.input;
          context = '';
          console.log('[RAG Parser] Agent 0 forwards input');
        }
        answer = agent1Output.output;
      }

      // If 3+ agents, third is review/validation
      if (agentCount >= 3) {
        const agent2Output = iterOutputs.find((o) => o.agentIndex === 2);
        if (agent2Output) {
          review = agent2Output.output;
          console.log('[RAG Parser] Found review from Agent 2');
        }
      }
    } else if (agentCount === 1) {
      // Single agent: input is question, output is answer
      const agent0Output = iterOutputs.find((o) => o.agentIndex === 0);
      console.log('[RAG Parser] Single agent mode:', { hasAgent0: !!agent0Output });

      if (agent0Output) {
        question = agent0Output.input;
        answer = agent0Output.output;
        context = '';
      }
    }

    if (question && answer) {
      console.log(`[RAG Parser] Created Q&A pair for iteration ${iterNum}:`, {
        questionPreview: question.substring(0, 50) + '...',
        answerPreview: answer.substring(0, 50) + '...'
      });

      pairs.push({
        id: generateUUID(),
        context: context?.trim() || '',
        question: question.trim(),
        answer: answer.trim(),
        review: review?.trim() || '',
        timestamp: iterOutputs[0]?.timestamp || new Date().toISOString(),
        qualityScore: iterOutputs[iterOutputs.length - 1]?.qualityScore || null,
      });
    } else {
      console.log(`[RAG Parser] Skipped iteration ${iterNum} - missing question or answer`);
    }
  });

  console.log(`[RAG Parser] Final result: ${pairs.length} Q&A pairs`);
  return pairs;
}

/**
 * Format Q&A pairs as JSONL
 */
export function formatAsJSONL(pairs, settings) {
  const { category, tags } = settings;

  return pairs
    .map((pair) => {
      const record = {
        id: pair.id,
        category,
        context: pair.context,
        question: pair.question,
        answer: pair.answer,
        source: 'chain-runner',
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
export function formatAsMarkdown(pairs, settings) {
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
export function formatAsText(pairs, settings) {
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

/**
 * Generate timestamped filename
 */
export function generateFilename(category, format) {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
  const extension = EXPORT_FORMATS[format]?.extension || '.txt';
  return `${category}_${timestamp}${extension}`;
}

/**
 * Main export function
 */
export async function exportRAGTraining(sessionLog, settings, electronAPI) {
  const { category, format, tags, outputPath } = settings;

  // Validate inputs
  if (!sessionLog) {
    return { success: false, error: 'No session log provided' };
  }

  if (!electronAPI) {
    return { success: false, error: 'Electron API not available' };
  }

  // Parse chain outputs
  const pairs = parseChainOutputs(sessionLog);

  if (pairs.length === 0) {
    return { success: false, error: 'No Q&A pairs found in chain output' };
  }

  // Format content
  let content;
  switch (format) {
    case 'jsonl':
      content = formatAsJSONL(pairs, settings);
      break;
    case 'markdown':
      content = formatAsMarkdown(pairs, settings);
      break;
    case 'txt':
    default:
      content = formatAsText(pairs, settings);
  }

  // Determine output path
  let basePath = outputPath;
  if (!basePath) {
    basePath = await electronAPI.getUserDataPath();
    basePath = `${basePath}\\rag-outputs`;
  }

  // Generate filename and full path
  const filename = generateFilename(category, format);
  const filePath = `${basePath}\\${filename}`;

  // Write file
  try {
    const result = await electronAPI.writeFile(filePath, content);
    if (result.success) {
      return {
        success: true,
        filePath,
        filename,
        pairCount: pairs.length,
      };
    } else {
      return { success: false, error: result.error || 'Failed to write file' };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}
