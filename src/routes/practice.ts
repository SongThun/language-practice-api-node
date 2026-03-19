import { FastifyInstance, FastifyRequest } from 'fastify';
import {
  createSessionSchema,
  submitWritingSchema,
  getSessionSchema,
} from '../schemas/practice';
import { CreateSessionBody, SubmitWritingBody } from '../types';
import { selectWords } from '../services/wordSelection';
import { generateExampleSentences } from '../services/llm';
import { evaluateSessionWriting } from '../services/evaluation';
import { validateOwnership } from '../services/ownership';
import { NotFoundError, ConflictError } from '../errors';

export default async function practiceRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.post('/', { schema: createSessionSchema }, async (
    request: FastifyRequest<{ Body: CreateSessionBody }>,
    reply,
  ) => {
    const { word_ids, count = 5, language, tag } = request.body;
    const userId = request.userId;

    let selectedWordIds: string[];

    if (word_ids?.length) {
      const owned = await validateOwnership(fastify.prisma, 'word', word_ids, userId);
      if (!owned) {
        return reply.code(403).send({ error: 'One or more words do not belong to you' });
      }
      selectedWordIds = word_ids;
    } else {
      const selected = await selectWords(fastify.prisma, userId, count, {
        language,
        tag,
      });

      if (selected.length === 0) {
        return reply.code(400).send({
          error: 'No words available for practice. Add some words first.',
        });
      }

      selectedWordIds = selected.map((w) => w.id);
    }

    const session = await fastify.prisma.practiceSession.create({
      data: {
        userId,
        status: 'active',
        practiceResults: {
          create: selectedWordIds.map((wordId) => ({
            wordId,
          })),
        },
      },
      include: {
        practiceResults: {
          include: {
            word: true,
          },
        },
      },
    });

    const words = session.practiceResults.map((pr) => ({
      word: pr.word.word,
      definition: pr.word.definition,
      language: pr.word.language,
    }));

    let examples: Map<string, string>;
    try {
      examples = await generateExampleSentences(words);
    } catch {
      examples = new Map();
    }

    const responseWords = session.practiceResults.map((pr) => ({
      id: pr.word.id,
      word: pr.word.word,
      definition: pr.word.definition,
      language: pr.word.language,
      example_sentence: examples.get(pr.word.word) ?? null,
    }));

    return reply.code(201).send({
      id: session.id,
      user_id: session.userId,
      status: session.status,
      created_at: session.createdAt,
      words: responseWords,
    });
  });

  fastify.get('/:id', { schema: getSessionSchema }, async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply,
  ) => {
    const session = await fastify.prisma.practiceSession.findFirst({
      where: { id: request.params.id, userId: request.userId },
      include: {
        practiceResults: {
          include: {
            word: true,
          },
        },
      },
    });

    if (!session) {
      return reply.code(404).send({ error: 'Session not found' });
    }

    return {
      id: session.id,
      user_id: session.userId,
      status: session.status,
      created_at: session.createdAt,
      results: session.practiceResults.map((pr) => ({
        id: pr.id,
        word: {
          id: pr.word.id,
          word: pr.word.word,
          definition: pr.word.definition,
          language: pr.word.language,
        },
        is_correct: pr.isCorrect,
        feedback: pr.feedback,
      })),
    };
  });

  fastify.post('/:id/evaluate', { schema: submitWritingSchema }, async (
    request: FastifyRequest<{ Params: { id: string }; Body: SubmitWritingBody }>,
    reply,
  ) => {
    try {
      const result = await evaluateSessionWriting(
        fastify.prisma,
        request.params.id,
        request.userId,
        request.body.writing,
      );
      return result;
    } catch (err) {
      if (err instanceof NotFoundError) {
        return reply.code(404).send({ error: err.message });
      }
      if (err instanceof ConflictError) {
        return reply.code(409).send({ error: err.message });
      }
      fastify.log.error(err, 'Evaluation failed');
      return reply.code(500).send({ error: 'Evaluation failed' });
    }
  });
}
