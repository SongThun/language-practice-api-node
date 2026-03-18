import { errorResponseSchema, uuidParamsSchema } from './shared';

export const tagResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    user_id: { type: 'string', format: 'uuid' },
    created_at: { type: 'string', format: 'date-time' },
  },
} as const;

export const createTagSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
  },
  response: {
    201: tagResponseSchema,
    409: errorResponseSchema,
  },
} as const;

export const updateTagSchema = {
  params: uuidParamsSchema,
  body: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
  },
  response: {
    200: tagResponseSchema,
    404: errorResponseSchema,
  },
} as const;

export const listTagsSchema = {
  response: {
    200: {
      type: 'array',
      items: tagResponseSchema,
    },
  },
} as const;

export const deleteTagSchema = {
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
