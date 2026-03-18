import { FastifyInstance, FastifyRequest } from 'fastify';
import {
  createWordSchema,
  updateWordSchema,
  getWordSchema,
  listWordsSchema,
  deleteWordSchema,
} from '../schemas/word';
import {
  CreateWordBody,
  UpdateWordBody,
  WordFilters,
} from '../types';

function formatWord(word: {
  id: string;
  word: string;
  definition: string;
  language: string;
  contextSentence: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  wordTags?: { tag: { id: string; name: string } }[];
}) {
  return {
    id: word.id,
    word: word.word,
    definition: word.definition,
    language: word.language,
    context_sentence: word.contextSentence,
    user_id: word.userId,
    created_at: word.createdAt,
    updated_at: word.updatedAt,
    tags: word.wordTags?.map((wt) => ({ id: wt.tag.id, name: wt.tag.name })) ?? [],
  };
}

export default async function wordRoutes(fastify: FastifyInstance): Promise<void> {
  // All word routes require auth
  fastify.addHook('onRequest', fastify.authenticate);

  // List words
  fastify.get('/', { schema: listWordsSchema }, async (
    request: FastifyRequest<{ Querystring: WordFilters }>,
  ) => {
    const { page = 1, limit = 20, language, search, tag } = request.query;
    const skip = (page - 1) * limit;
    const userId = request.userId;

    const where: Record<string, unknown> = { userId };

    if (language) {
      where.language = language;
    }

    if (search) {
      where.OR = [
        { word: { contains: search, mode: 'insensitive' } },
        { definition: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tag) {
      where.wordTags = {
        some: {
          tag: { name: { equals: tag, mode: 'insensitive' } },
        },
      };
    }

    const [words, total] = await Promise.all([
      fastify.prisma.word.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          wordTags: {
            include: { tag: true },
          },
        },
      }),
      fastify.prisma.word.count({ where }),
    ]);

    return {
      items: words.map(formatWord),
      total,
      page,
      limit,
    };
  });

  // Get word by ID
  fastify.get('/:id', { schema: getWordSchema }, async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply,
  ) => {
    const word = await fastify.prisma.word.findFirst({
      where: { id: request.params.id, userId: request.userId },
      include: {
        wordTags: {
          include: { tag: true },
        },
      },
    });

    if (!word) {
      return reply.code(404).send({ error: 'Word not found' });
    }

    return formatWord(word);
  });

  // Create word
  fastify.post('/', { schema: createWordSchema }, async (
    request: FastifyRequest<{ Body: CreateWordBody }>,
    reply,
  ) => {
    const { word, definition, language, context_sentence, tag_ids } = request.body;
    const userId = request.userId;

    const created = await fastify.prisma.word.create({
      data: {
        word,
        definition,
        language,
        contextSentence: context_sentence,
        userId,
        wordTags: tag_ids?.length
          ? {
              create: tag_ids.map((tagId) => ({ tagId })),
            }
          : undefined,
      },
      include: {
        wordTags: {
          include: { tag: true },
        },
      },
    });

    // Create initial word stats (box 1)
    await fastify.prisma.wordStats.create({
      data: {
        wordId: created.id,
        userId,
        box: 1,
      },
    });

    return reply.code(201).send(formatWord(created));
  });

  // Update word
  fastify.put('/:id', { schema: updateWordSchema }, async (
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateWordBody }>,
    reply,
  ) => {
    const existing = await fastify.prisma.word.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Word not found' });
    }

    const { word, definition, language, context_sentence, tag_ids } = request.body;

    // If tag_ids provided, replace all tags
    if (tag_ids !== undefined) {
      await fastify.prisma.wordTag.deleteMany({
        where: { wordId: request.params.id },
      });
    }

    const updated = await fastify.prisma.word.update({
      where: { id: request.params.id },
      data: {
        ...(word !== undefined && { word }),
        ...(definition !== undefined && { definition }),
        ...(language !== undefined && { language }),
        ...(context_sentence !== undefined && { contextSentence: context_sentence }),
        ...(tag_ids !== undefined && {
          wordTags: {
            create: tag_ids.map((tagId) => ({ tagId })),
          },
        }),
      },
      include: {
        wordTags: {
          include: { tag: true },
        },
      },
    });

    return formatWord(updated);
  });

  // Delete word
  fastify.delete('/:id', { schema: deleteWordSchema }, async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply,
  ) => {
    const existing = await fastify.prisma.word.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Word not found' });
    }

    await fastify.prisma.word.delete({
      where: { id: request.params.id },
    });

    return { message: 'Word deleted' };
  });
}
