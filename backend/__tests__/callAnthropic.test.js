// __tests__/callAnthropic.test.js
// Tests for the Anthropic API wrapper: error mapping, JSON parsing, retry logic.

process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgres://unused';
process.env.NODE_ENV = 'production'; // suppress dev logging

jest.mock('@anthropic-ai/sdk');
const Anthropic = require('@anthropic-ai/sdk');

const { callAnthropic } = require('../ai/callAnthropic');

let mockCreate;

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate = jest.fn();
  Anthropic.mockImplementation(() => ({
    messages: { create: mockCreate },
  }));
});

function apiResponse(text, inputTokens = 100, outputTokens = 50) {
  return {
    content: [{ text }],
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
    model: 'claude-sonnet-4-6',
  };
}

describe('callAnthropic — successful responses', () => {
  test('returns parsed JSON when parseJson is true', async () => {
    mockCreate.mockResolvedValueOnce(apiResponse('[{"criterion":"Test","strength":"Strong"}]'));

    const result = await callAnthropic({
      apiKey: 'sk-test', systemPrompt: 'test', userContent: '{}', maxTokens: 100,
    });

    expect(result.ok).toBe(true);
    expect(result.data).toEqual([{ criterion: 'Test', strength: 'Strong' }]);
    expect(result.usage.input_tokens).toBe(100);
    expect(result.usage.output_tokens).toBe(50);
  });

  test('returns raw text when parseJson is false', async () => {
    mockCreate.mockResolvedValueOnce(apiResponse('Plain narrative text.'));

    const result = await callAnthropic({
      apiKey: 'sk-test', systemPrompt: 'test', userContent: '{}',
      maxTokens: 100, parseJson: false,
    });

    expect(result.ok).toBe(true);
    expect(result.data).toBe('Plain narrative text.');
  });

  test('strips markdown fences from JSON', async () => {
    mockCreate.mockResolvedValueOnce(apiResponse('```json\n[{"a":1}]\n```'));

    const result = await callAnthropic({
      apiKey: 'sk-test', systemPrompt: 'test', userContent: '{}', maxTokens: 100,
    });

    expect(result.ok).toBe(true);
    expect(result.data).toEqual([{ a: 1 }]);
  });

  test('extracts JSON from surrounding prose', async () => {
    mockCreate.mockResolvedValueOnce(
      apiResponse('Here is the analysis:\n[{"a":1}]\nHope this helps!')
    );

    const result = await callAnthropic({
      apiKey: 'sk-test', systemPrompt: 'test', userContent: '{}', maxTokens: 100,
    });

    expect(result.ok).toBe(true);
    expect(result.data).toEqual([{ a: 1 }]);
  });

  test('repairs truncated JSON with missing closing brackets', async () => {
    // Simulates a response cut short — missing closing ] after complete items
    mockCreate.mockResolvedValueOnce(
      apiResponse('[{"a":1},{"b":2}')
    );

    const result = await callAnthropic({
      apiKey: 'sk-test', systemPrompt: 'test', userContent: '{}', maxTokens: 100,
    });

    expect(result.ok).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data).toHaveLength(2);
  });
});

describe('callAnthropic — error handling', () => {
  test('maps 401 to INVALID_KEY', async () => {
    const err = new Error('Unauthorized');
    err.status = 401;
    mockCreate.mockRejectedValueOnce(err);

    const result = await callAnthropic({
      apiKey: 'sk-bad', systemPrompt: 'test', userContent: '{}', maxTokens: 100,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('INVALID_KEY');
  });

  test('maps 403 to INVALID_KEY', async () => {
    const err = new Error('Forbidden');
    err.status = 403;
    mockCreate.mockRejectedValueOnce(err);

    const result = await callAnthropic({
      apiKey: 'sk-bad', systemPrompt: 'test', userContent: '{}', maxTokens: 100,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('INVALID_KEY');
  });

  test('maps 429 to RATE_LIMITED', async () => {
    const err = new Error('Too many requests');
    err.status = 429;
    mockCreate.mockRejectedValueOnce(err);

    const result = await callAnthropic({
      apiKey: 'sk-test', systemPrompt: 'test', userContent: '{}', maxTokens: 100,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('RATE_LIMITED');
  });

  test('maps billing errors to BILLING', async () => {
    const err = new Error('Insufficient credit balance');
    err.status = 402;
    mockCreate.mockRejectedValueOnce(err);

    const result = await callAnthropic({
      apiKey: 'sk-test', systemPrompt: 'test', userContent: '{}', maxTokens: 100,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('BILLING');
  });

  test('returns PARSE_ERROR when JSON cannot be parsed', async () => {
    mockCreate.mockResolvedValueOnce(apiResponse('This is not JSON at all.'));

    const result = await callAnthropic({
      apiKey: 'sk-test', systemPrompt: 'test', userContent: '{}', maxTokens: 100,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('PARSE_ERROR');
  });
});

describe('callAnthropic — retry logic', () => {
  test('retries on 529 and succeeds on second attempt', async () => {
    const overloadErr = new Error('Overloaded');
    overloadErr.status = 529;

    mockCreate
      .mockRejectedValueOnce(overloadErr)
      .mockResolvedValueOnce(apiResponse('{"result":"ok"}'));

    const result = await callAnthropic({
      apiKey: 'sk-test', systemPrompt: 'test', userContent: '{}', maxTokens: 100,
    });

    expect(result.ok).toBe(true);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  }, 15000);

  test('gives up after max retries on 529', async () => {
    const overloadErr = new Error('Overloaded');
    overloadErr.status = 529;

    mockCreate
      .mockRejectedValueOnce(overloadErr)
      .mockRejectedValueOnce(overloadErr)
      .mockRejectedValueOnce(overloadErr);

    const result = await callAnthropic({
      apiKey: 'sk-test', systemPrompt: 'test', userContent: '{}', maxTokens: 100,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe('OVERLOADED');
    expect(mockCreate).toHaveBeenCalledTimes(3); // initial + 2 retries
  }, 15000);

  test('does not retry on non-529 errors', async () => {
    const err = new Error('Bad key');
    err.status = 401;
    mockCreate.mockRejectedValueOnce(err);

    const result = await callAnthropic({
      apiKey: 'sk-bad', systemPrompt: 'test', userContent: '{}', maxTokens: 100,
    });

    expect(result.ok).toBe(false);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
