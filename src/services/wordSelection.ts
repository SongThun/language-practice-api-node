import { PrismaClient } from '@prisma/client';

interface WordWithStats {
  id: string;
  word: string;
  definition: string;
  language: string;
  wordStats: {
    box: number;
    lastPracticed: Date | null;
  } | null;
}

/**
 * Modified Leitner system word selection.
 *
 * Selection probability is proportional to:
 *   (1 / box) * timeSinceLastPracticed
 *
 * Words that have never been practiced get a high default weight.
 * Words in lower boxes (more incorrect) appear more often.
 */
export async function selectWords(
  prisma: PrismaClient,
  userId: string,
  count: number,
  options?: { language?: string; tag?: string },
): Promise<WordWithStats[]> {
  const where: Record<string, unknown> = { userId };

  if (options?.language) {
    where.language = options.language;
  }

  if (options?.tag) {
    where.wordTags = {
      some: {
        tag: { name: options.tag },
      },
    };
  }

  const words = await prisma.word.findMany({
    where,
    include: {
      wordStats: {
        select: {
          box: true,
          lastPracticed: true,
        },
      },
    },
  });

  if (words.length === 0) {
    return [];
  }

  const now = Date.now();
  const ONE_DAY_MS = 86400000;

  const weighted = words.map((w) => {
    const box = w.wordStats?.box ?? 1;
    const lastPracticed = w.wordStats?.lastPracticed;

    const timeFactor = lastPracticed
      ? Math.max((now - lastPracticed.getTime()) / ONE_DAY_MS, 0.1)
      : 7; // Never practiced = treat as 7 days ago

    const weight = (1 / box) * timeFactor;

    return { word: w, weight };
  });

  const selected: WordWithStats[] = [];
  const remaining = [...weighted];

  const selectCount = Math.min(count, remaining.length);

  for (let i = 0; i < selectCount; i++) {
    const totalWeight = remaining.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    let selectedIndex = 0;
    for (let j = 0; j < remaining.length; j++) {
      random -= remaining[j].weight;
      if (random <= 0) {
        selectedIndex = j;
        break;
      }
    }

    selected.push(remaining[selectedIndex].word);
    remaining.splice(selectedIndex, 1);
  }

  return selected;
}

export async function updateWordStats(
  prisma: PrismaClient,
  wordId: string,
  userId: string,
  isCorrect: boolean,
): Promise<void> {
  await prisma.wordStats.upsert({
    where: { wordId },
    create: {
      wordId,
      userId,
      box: isCorrect ? 2 : 1,
      lastPracticed: new Date(),
      successCount: isCorrect ? 1 : 0,
      failCount: isCorrect ? 0 : 1,
    },
    update: {
      box: isCorrect
        ? { increment: 1 }
        : 1,
      lastPracticed: new Date(),
      ...(isCorrect
        ? { successCount: { increment: 1 } }
        : { failCount: { increment: 1 } }),
    },
  });

  // Cap box at 5 (Prisma increment can exceed the max)
  await prisma.wordStats.updateMany({
    where: { wordId, box: { gt: 5 } },
    data: { box: 5 },
  });
}
