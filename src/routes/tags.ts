import { FastifyInstance, FastifyRequest } from 'fastify';
import {
  createTagSchema,
  updateTagSchema,
  listTagsSchema,
  deleteTagSchema,
} from '../schemas/tag';
import { CreateTagBody, UpdateTagBody } from '../types';

function formatTag(tag: {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
}) {
  return {
    id: tag.id,
    name: tag.name,
    user_id: tag.userId,
    created_at: tag.createdAt,
  };
}

export default async function tagRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/', { schema: listTagsSchema }, async (request: FastifyRequest) => {
    const tags = await fastify.prisma.tag.findMany({
      where: { userId: request.userId },
      orderBy: { name: 'asc' },
    });

    return tags.map(formatTag);
  });

  fastify.post('/', { schema: createTagSchema }, async (
    request: FastifyRequest<{ Body: CreateTagBody }>,
    reply,
  ) => {
    const { name } = request.body;
    const userId = request.userId;

    const existing = await fastify.prisma.tag.findUnique({
      where: { name_userId: { name, userId } },
    });

    if (existing) {
      return reply.code(409).send({ error: 'Tag already exists' });
    }

    const tag = await fastify.prisma.tag.create({
      data: { name, userId },
    });

    return reply.code(201).send(formatTag(tag));
  });

  fastify.put('/:id', { schema: updateTagSchema }, async (
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateTagBody }>,
    reply,
  ) => {
    const existing = await fastify.prisma.tag.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Tag not found' });
    }

    const tag = await fastify.prisma.tag.update({
      where: { id: request.params.id },
      data: { name: request.body.name },
    });

    return formatTag(tag);
  });

  fastify.delete('/:id', { schema: deleteTagSchema }, async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply,
  ) => {
    const existing = await fastify.prisma.tag.findFirst({
      where: { id: request.params.id, userId: request.userId },
    });

    if (!existing) {
      return reply.code(404).send({ error: 'Tag not found' });
    }

    await fastify.prisma.tag.delete({
      where: { id: request.params.id },
    });

    return { message: 'Tag deleted' };
  });
}
