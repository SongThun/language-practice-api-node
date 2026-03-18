import { errorResponseSchema, uuidParamsSchema } from './shared';

export const wordResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    word: { type: 'string' },
    definition: { type: 'string' },
    language: { type: 'string' },
    context_sentence: { type: ['string', 'null'] },
    user_id: { type: 'string', format: 'uuid' },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    tags: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
        },
      },
    },
  },
} as const;

export const createWordSchema = {
  body: {
    type: 'object',
    required: ['word', 'definition', 'language'],
    properties: {
      word: { type: 'string', minLength: 1 },
      definition: { type: 'string', minLength: 1 },
      language: { type: 'string', minLength: 1 },
      context_sentence: { type: 'string' },
      tag_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
    },
    additionalProperties: false,
  },
  response: {
    201: wordResponseSchema,
  },
} as const;

export const updateWordSchema = {
  params: uuidParamsSchema,
  body: {
    type: 'object',
    properties: {
      word: { type: 'string', minLength: 1 },
      definition: { type: 'string', minLength: 1 },
      language: { type: 'string', minLength: 1 },
      context_sentence: { type: 'string' },
      tag_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
    },
    additionalProperties: false,
  },
  response: {
    200: wordResponseSchema,
    404: errorResponseSchema,
  },
} as const;

export const getWordSchema = {
  params: uuidParamsSchema,
  response: {
    200: wordResponseSchema,
    404: errorResponseSchema,
  },
} as const;

export const listWordsSchema = {
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      language: { type: 'string' },
      search: { type: 'string' },
      tag: { type: 'string' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        items: { type: 'array', items: wordResponseSchema },
        total: { type: 'integer' },
        page: { type: 'integer' },
        limit: { type: 'integer' },
      },
    },
  },
} as const;

export const deleteWordSchema = {
  params: uuidParamsSchema,
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
    404: errorResponseSchema,
  },
} as const;
