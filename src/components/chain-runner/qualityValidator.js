/**
 * Q&A Quality Validation for Chain Runner
 * Validates Q&A pairs using AI to score quality metrics
 */

/**
 * Build system prompt for Q&A quality validation
 */
export function buildValidatorPrompt(question, answer) {
  return `You are a quality evaluator for AI-generated Q&A training data. Your task is to evaluate the quality of a question-answer pair across multiple dimensions.

**Question:**
${question}

**Answer:**
${answer}

**Evaluation Criteria:**

Evaluate the answer on these dimensions (score 0.0 to 1.0):

1. **CORRECTNESS** - Is the answer factually accurate and free from errors?
   - 1.0: Completely accurate, no errors
   - 0.5: Mostly accurate with minor issues
   - 0.0: Contains significant factual errors

2. **COMPLETENESS** - Does the answer fully address all aspects of the question?
   - 1.0: Fully addresses the question, nothing missing
   - 0.5: Addresses main points but missing some details
   - 0.0: Incomplete or leaves major gaps

3. **CLARITY** - Is the answer clear, well-structured, and easy to understand?
   - 1.0: Crystal clear, well-organized
   - 0.5: Understandable but could be clearer
   - 0.0: Confusing or poorly structured

4. **RELEVANCE** - Does the answer stay on topic and avoid unnecessary tangents?
   - 1.0: Perfectly relevant, no tangents
   - 0.5: Mostly relevant with minor tangents
   - 0.0: Off-topic or contains significant irrelevant content

5. **OVERALL** - Average of the above four scores

6. **ISSUES** - Brief note on any problems found, or "none" if quality is good

**Output Format:**

Return ONLY a JSON object with this exact structure. No additional text, markdown formatting, or explanations.

{
  "correctness": 0.95,
  "completeness": 0.90,
  "clarity": 1.0,
  "relevance": 0.85,
  "overall": 0.925,
  "issues": "Minor issue description or 'none'"
}

Provide your evaluation now:`;
}

/**
 * Validate a single Q&A pair using AI
 * @param {string} question - The question
 * @param {string} answer - The answer to validate
 * @param {string} provider - AI provider (anthropic, openai, ollama)
 * @param {string} apiKey - API key (not needed for Ollama)
 * @param {string} model - Model name
 * @returns {Promise<Object>} Validation scores object
 */
export async function validateQAPair(question, answer, provider, apiKey, model) {
  // Ollama doesn't require an API key (runs locally)
  if (provider !== 'ollama' && !apiKey) {
    return { success: false, error: 'API key not provided' };
  }

  // Build the validation prompt
  const validationPrompt = buildValidatorPrompt(question, answer);

  try {
    let response;
    let scoreText = '';

    if (provider === 'anthropic') {
      // Anthropic API call
      const requestBody = {
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: validationPrompt
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
      scoreText = data.content?.[0]?.text || '';

    } else if (provider === 'openai') {
      // OpenAI API call
      const requestBody = {
        model: model || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a quality evaluator. Follow instructions precisely and return valid JSON.'
          },
          {
            role: 'user',
            content: validationPrompt
          }
        ],
        temperature: 0.3, // Lower temperature for more consistent scoring
        max_tokens: 1000
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
      scoreText = data.choices?.[0]?.message?.content || '';

    } else if (provider === 'ollama') {
      // Ollama API call
      const requestBody = {
        model: model || 'mistral',
        messages: [
          {
            role: 'system',
            content: 'You are a quality evaluator. Follow instructions precisely and return valid JSON.'
          },
          {
            role: 'user',
            content: validationPrompt
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
      scoreText = data.message?.content || '';

    } else {
      return { success: false, error: `Unsupported provider: ${provider}` };
    }

    // Parse the JSON object from the response
    // Handle potential markdown code blocks
    let jsonText = scoreText.trim();

    // Remove markdown code fences if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Try to parse the JSON
    let scores;
    try {
      scores = JSON.parse(jsonText);
    } catch (parseError) {
      // If direct parse fails, try to extract JSON object from the text
      const objectMatch = jsonText.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        scores = JSON.parse(objectMatch[0]);
      } else {
        return {
          success: false,
          error: `Failed to parse JSON response: ${parseError.message}`,
          rawResponse: scoreText
        };
      }
    }

    // Validate that we got the expected score structure
    const requiredFields = ['correctness', 'completeness', 'clarity', 'relevance', 'overall', 'issues'];
    const missingFields = requiredFields.filter(field => !(field in scores));

    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`,
        rawResponse: scoreText
      };
    }

    // Ensure numeric fields are numbers
    ['correctness', 'completeness', 'clarity', 'relevance', 'overall'].forEach(field => {
      if (typeof scores[field] !== 'number') {
        scores[field] = parseFloat(scores[field]) || 0;
      }
      // Clamp to 0-1 range
      scores[field] = Math.max(0, Math.min(1, scores[field]));
    });

    console.log(`[Quality Validator] Validated Q&A pair - Overall: ${scores.overall.toFixed(2)}`);

    return {
      success: true,
      scores
    };

  } catch (error) {
    console.error('[Quality Validator] Error validating Q&A pair:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Extract Q&A pairs from a session log
 * @param {Object} sessionLog - The Chain Runner session log
 * @returns {Array<{question: string, answer: string}>} Array of Q&A pairs
 */
function extractQAPairs(sessionLog) {
  const qaPairs = [];

  if (!sessionLog || !sessionLog.turns || !Array.isArray(sessionLog.turns)) {
    console.warn('[Quality Validator] Invalid session log structure');
    return qaPairs;
  }

  for (const turn of sessionLog.turns) {
    if (!turn.outputs || !Array.isArray(turn.outputs)) {
      continue;
    }

    // Look for the initial user question/task in the turn
    let question = turn.initialTask || turn.taskSpec || 'Unknown task';

    // Find the final agent's output as the answer
    // Typically the last agent in the chain provides the final answer
    const lastOutput = turn.outputs[turn.outputs.length - 1];
    if (lastOutput && lastOutput.output) {
      const answer = lastOutput.output;

      qaPairs.push({
        question,
        answer,
        turnIndex: turn.turnIndex,
        timestamp: turn.timestamp
      });
    }
  }

  console.log(`[Quality Validator] Extracted ${qaPairs.length} Q&A pairs from session log`);
  return qaPairs;
}

/**
 * Validate all Q&A pairs in a session log
 * @param {Object} sessionLog - The Chain Runner session log
 * @param {string} provider - AI provider (anthropic, openai, ollama)
 * @param {string} apiKey - API key (not needed for Ollama)
 * @param {string} model - Model name
 * @param {Function} onProgress - Callback function (current, total) => void
 * @returns {Promise<Array>} Array of validation result objects
 */
export async function validateSession(sessionLog, provider, apiKey, model, onProgress) {
  console.log('[Quality Validator] Starting session validation');

  // Extract Q&A pairs from session log
  const qaPairs = extractQAPairs(sessionLog);

  if (qaPairs.length === 0) {
    console.warn('[Quality Validator] No Q&A pairs found in session log');
    return [];
  }

  const results = [];
  const total = qaPairs.length;

  // Validate each Q&A pair
  for (let i = 0; i < qaPairs.length; i++) {
    const pair = qaPairs[i];
    const current = i + 1;

    console.log(`[Quality Validator] Validating Q&A pair ${current}/${total}`);

    // Call progress callback
    if (typeof onProgress === 'function') {
      onProgress(current, total);
    }

    // Validate the pair
    const validationResult = await validateQAPair(
      pair.question,
      pair.answer,
      provider,
      apiKey,
      model
    );

    // Store result
    results.push({
      turnIndex: pair.turnIndex,
      timestamp: pair.timestamp,
      question: pair.question,
      answer: pair.answer,
      validation: validationResult.success ? validationResult.scores : null,
      error: validationResult.success ? null : validationResult.error
    });

    // Small delay to avoid rate limiting
    if (i < qaPairs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Calculate aggregate statistics
  const successfulValidations = results.filter(r => r.validation !== null);
  if (successfulValidations.length > 0) {
    const avgCorrectness = successfulValidations.reduce((sum, r) => sum + r.validation.correctness, 0) / successfulValidations.length;
    const avgCompleteness = successfulValidations.reduce((sum, r) => sum + r.validation.completeness, 0) / successfulValidations.length;
    const avgClarity = successfulValidations.reduce((sum, r) => sum + r.validation.clarity, 0) / successfulValidations.length;
    const avgRelevance = successfulValidations.reduce((sum, r) => sum + r.validation.relevance, 0) / successfulValidations.length;
    const avgOverall = successfulValidations.reduce((sum, r) => sum + r.validation.overall, 0) / successfulValidations.length;

    console.log('[Quality Validator] Session validation complete');
    console.log(`  - Total Q&A pairs: ${total}`);
    console.log(`  - Successfully validated: ${successfulValidations.length}`);
    console.log(`  - Average correctness: ${avgCorrectness.toFixed(2)}`);
    console.log(`  - Average completeness: ${avgCompleteness.toFixed(2)}`);
    console.log(`  - Average clarity: ${avgClarity.toFixed(2)}`);
    console.log(`  - Average relevance: ${avgRelevance.toFixed(2)}`);
    console.log(`  - Average overall: ${avgOverall.toFixed(2)}`);
  }

  return results;
}

/**
 * Save validation results to a file
 * @param {Array} validationResults - Results from validateSession()
 * @param {string} sessionName - Name/ID of the session
 * @param {Object} electronAPI - Electron API object
 * @returns {Promise<Object>} Result object with success/error
 */
export async function saveValidationResults(validationResults, sessionName, electronAPI) {
  try {
    const userDataPath = await electronAPI.getUserDataPath();
    const validationDir = `${userDataPath}\\validation-results`;

    // Create timestamp for filename
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);

    // Sanitize session name for filename
    const safeSessionName = sessionName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `validation_${safeSessionName}_${timestamp}.json`;
    const filePath = `${validationDir}\\${filename}`;

    // Calculate summary statistics
    const successful = validationResults.filter(r => r.validation !== null);
    const summary = {
      totalPairs: validationResults.length,
      successfulValidations: successful.length,
      failedValidations: validationResults.length - successful.length
    };

    if (successful.length > 0) {
      summary.averageScores = {
        correctness: successful.reduce((sum, r) => sum + r.validation.correctness, 0) / successful.length,
        completeness: successful.reduce((sum, r) => sum + r.validation.completeness, 0) / successful.length,
        clarity: successful.reduce((sum, r) => sum + r.validation.clarity, 0) / successful.length,
        relevance: successful.reduce((sum, r) => sum + r.validation.relevance, 0) / successful.length,
        overall: successful.reduce((sum, r) => sum + r.validation.overall, 0) / successful.length
      };
    }

    // Prepare data structure
    const data = {
      sessionName,
      timestamp: new Date().toISOString(),
      summary,
      results: validationResults,
      metadata: {
        validator: 'chain-runner-quality-validator',
        version: '1.0'
      }
    };

    // Write file
    const result = await electronAPI.writeFile(filePath, JSON.stringify(data, null, 2));

    if (result.success) {
      console.log(`[Quality Validator] Saved validation results to ${filename}`);
      return {
        success: true,
        filePath,
        filename,
        summary
      };
    } else {
      return { success: false, error: result.error || 'Failed to write file' };
    }
  } catch (error) {
    console.error('[Quality Validator] Error saving validation results:', error);
    return { success: false, error: error.message };
  }
}
