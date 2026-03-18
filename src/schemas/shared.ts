export const errorResponseSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  },
} as const;

export const uuidParamsSchema = {
  type: 'object' as const,
  required: ['id'] as const,
  properties: {
    id: { type: 'string' as const, format: 'uuid' },
  },
};
