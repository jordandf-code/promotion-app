// ai/callAnthropic.js
// Wrapper around the Anthropic SDK with retry logic, error mapping, and token logging.

const Anthropic = require('@anthropic-ai/sdk');

const RETRY_DELAYS = [2000, 4000]; // ms — exponential backoff for 529

function parseAIJson(text) {
  // Strip markdown fences
  const clean = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim();

  // Try direct parse
  try { return JSON.parse(clean); } catch {}

  // Extract first JSON array or object
  const arrayMatch = clean.match(/\[[\s\S]*\]/);
  if (arrayMatch) try { return JSON.parse(arrayMatch[0]); } catch {}

  const objMatch = clean.match(/\{[\s\S]*\}/);
  if (objMatch) try { return JSON.parse(objMatch[0]); } catch {}

  // Attempt to repair truncated JSON by closing open brackets/braces
  let candidate = clean;
  // Find the start of JSON
  const start = clean.search(/[\[{]/);
  if (start >= 0) {
    candidate = clean.slice(start);
    // Remove any trailing incomplete string (cut mid-value)
    candidate = candidate.replace(/,\s*"[^"]*$/, '');      // trailing key
    candidate = candidate.replace(/,\s*"[^"]*":\s*"[^"]*$/, ''); // trailing key:value
    candidate = candidate.replace(/,\s*$/, '');             // trailing comma
    // Close open structures
    const opens  = (candidate.match(/\{/g) || []).length;
    const closes = (candidate.match(/\}/g) || []).length;
    const openBr  = (candidate.match(/\[/g) || []).length;
    const closeBr = (candidate.match(/\]/g) || []).length;
    for (let i = 0; i < openBr - closeBr; i++) candidate += ']';
    for (let i = 0; i < opens - closes; i++)   candidate += '}';
    try { return JSON.parse(candidate); } catch {}
  }

  throw new Error('No valid JSON found in response');
}

function mapErrorCode(err) {
  const status  = err?.status;
  const message = (err?.message ?? String(err)).toLowerCase();

  if (status === 401) return 'INVALID_KEY';
  if (status === 403) return 'INVALID_KEY';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 529) return 'OVERLOADED';
  if (status === 402 || message.includes('credit') || message.includes('billing'))
    return 'BILLING';
  if (status === 400 && message.includes('token')) return 'CONTEXT_TOO_LARGE';
  return 'AI_ERROR';
}

function friendlyMessage(code, rawMessage) {
  const messages = {
    INVALID_KEY:  'Your API key is invalid — check the key saved in Admin.',
    RATE_LIMITED: 'Rate limit exceeded — wait a moment and try again.',
    OVERLOADED:   'The AI service is temporarily overloaded. Try again in a minute.',
    BILLING:      'Insufficient API credits — top up at console.anthropic.com.',
    PARSE_ERROR:       'The AI returned an unexpected format. Try regenerating.',
    CONTEXT_TOO_LARGE: 'Your data exceeds the AI context limit. Try shortening your IBM criteria or career history.',
    AI_ERROR:          `AI request failed: ${rawMessage}`,
  };
  return messages[code] || messages.AI_ERROR;
}

async function callAnthropic({ apiKey, systemPrompt, userContent, maxTokens, parseJson = true }) {
  const client = new Anthropic({ apiKey });
  let lastError = null;

  const messages = [{ role: 'user', content: userContent }];

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const response = await client.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: maxTokens,
        system:     systemPrompt,
        messages,
      });

      console.log(`[AI] input_tokens=${response.usage.input_tokens} output_tokens=${response.usage.output_tokens} model=${response.model}`);

      const rawText = response.content[0].text.trim();
      const usage = {
        input_tokens:  response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      };

      if (!parseJson) {
        return { ok: true, data: rawText, usage };
      }

      try {
        const parsed = parseAIJson(rawText);
        return { ok: true, data: parsed, usage };
      } catch (parseErr) {
        console.error('[AI] JSON parse failed:', parseErr.message);
        console.error('[AI] Raw response (first 500 chars):', rawText.slice(0, 500));
        return { ok: false, error: friendlyMessage('PARSE_ERROR'), code: 'PARSE_ERROR' };
      }
    } catch (err) {
      lastError = err;
      const code = mapErrorCode(err);

      // Only retry on overloaded (529)
      if (code === 'OVERLOADED' && attempt < RETRY_DELAYS.length) {
        const delay = RETRY_DELAYS[attempt];
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[AI] 529 overloaded — retrying in ${delay}ms (attempt ${attempt + 1})`);
        }
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      console.error(`[AI] ${code}:`, err.message);
      return { ok: false, error: friendlyMessage(code, err.message), code };
    }
  }

  // Should not reach here, but safety net
  const code = mapErrorCode(lastError);
  return { ok: false, error: friendlyMessage(code, lastError?.message), code };
}

module.exports = { callAnthropic };
