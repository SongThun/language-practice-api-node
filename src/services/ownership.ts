import { PrismaClient } from '@prisma/client';

export async function validateOwnership(
  prisma: PrismaClient,
  model: 'tag' | 'word',
  ids: string[],
  userId: string,
): Promise<boolean> {
  const where = { id: { in: ids }, userId };
  const count =
    model === 'tag'
      ? await prisma.tag.count({ where })
      : await prisma.word.count({ where });
  return count === ids.length;
}
