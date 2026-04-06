// utils/aiErrors.js
// Maps backend AI error codes to user-facing messages.

const ERROR_MESSAGES = {
  NO_KEY:       'Add your Anthropic API key in Admin > GenAI to use AI features.',
  NO_CRITERIA:  'Paste your IBM Partner criteria in Admin > GenAI first.',
  INVALID_KEY:  'Your API key is invalid — check the key saved in Admin.',
  RATE_LIMITED: 'Rate limit exceeded — wait a moment and try again.',
  OVERLOADED:   'The AI service is temporarily overloaded. Try again in a minute.',
  BILLING:      'Insufficient API credits — top up at console.anthropic.com.',
  PARSE_ERROR:  'The AI returned an unexpected format. Try regenerating.',
  AI_ERROR:     'AI request failed. Try again.',
};

export function mapAiError(code, fallbackMessage) {
  return ERROR_MESSAGES[code] || fallbackMessage || ERROR_MESSAGES.AI_ERROR;
}
