import { errorResponseSchema, uuidParamsSchema } from './shared';

export const practiceSessionResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    user_id: { type: 'string', format: 'uuid' },
    status: { type: 'string' },
    created_at: { type: 'string', format: 'date-time' },
    words: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          word: { type: 'string' },
          definition: { type: 'string' },
          language: { type: 'string' },
          example_sentence: { type: ['string', 'null'] },
        },
      },
    },
  },
} as const;

export const createSessionSchema = {
  body: {
    type: 'object',
    properties: {
      word_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
      count: { type: 'integer', minimum: 1, maximum: 20, default: 5 },
      language: { type: 'string' },
      tag: { type: 'string' },
    },
    additionalProperties: false,
  },
  response: {
    201: practiceSessionResponseSchema,
    400: errorResponseSchema,
    403: errorResponseSchema,
  },
} as const;

export const submitWritingSchema = {
  params: uuidParamsSchema,
  body: {
    type: 'object',
    required: ['writing'],
    properties: {
      writing: { type: 'string', minLength: 1, maxLength: 5000 },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: 'object',
      properties: {
        session_id: { type: 'string', format: 'uuid' },
        overall_feedback: { type: 'string' },
        grammar_corrections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              original: { type: 'string' },
              corrected: { type: 'string' },
              explanation: { type: 'string' },
            },
          },
        },
        vocabulary_usage: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              word: { type: 'string' },
              used_correctly: { type: 'boolean' },
              feedback: { type: 'string' },
            },
          },
        },
        score: { type: 'number' },
      },
    },
    400: errorResponseSchema,
    404: errorResponseSchema,
    409: errorResponseSchema,
    500: errorResponseSchema,
  },
} as const;

export const getSessionSchema = {
  params: uuidParamsSchema,
  response: {
    404: errorResponseSchema,
  },
} as const;
