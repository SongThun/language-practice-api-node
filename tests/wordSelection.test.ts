import { selectWords, updateWordStats } from '../src/services/wordSelection';

// Mock PrismaClient
function createMockPrisma(words: unknown[]) {
  return {
    word: {
      findMany: jest.fn().mockResolvedValue(words),
    },
    wordStats: {
      upsert: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  } as any;
}

describe('wordSelection', () => {
  describe('selectWords', () => {
    it('returns empty array when no words available', async () => {
      const prisma = createMockPrisma([]);
      const result = await selectWords(prisma, 'user-1', 5);
      expect(result).toEqual([]);
    });

    it('selects up to the requested count', async () => {
      const words = [
        { id: '1', word: 'hello', definition: 'greeting', language: 'en', wordStats: null },
        { id: '2', word: 'world', definition: 'earth', language: 'en', wordStats: null },
        { id: '3', word: 'foo', definition: 'bar', language: 'en', wordStats: null },
      ];
      const prisma = createMockPrisma(words);
      const result = await selectWords(prisma, 'user-1', 2);
      expect(result).toHaveLength(2);
    });

    it('returns all words if count exceeds available', async () => {
      const words = [
        { id: '1', word: 'hello', definition: 'greeting', language: 'en', wordStats: null },
      ];
      const prisma = createMockPrisma(words);
      const result = await selectWords(prisma, 'user-1', 5);
      expect(result).toHaveLength(1);
    });

    it('favors words in lower boxes', async () => {
      // Words in box 1 should be selected more often than box 5
      const now = new Date();
      const words = [
        {
          id: 'low',
          word: 'hard',
          definition: 'difficult',
          language: 'en',
          wordStats: { box: 1, lastPracticed: now },
        },
        {
          id: 'high',
          word: 'easy',
          definition: 'simple',
          language: 'en',
          wordStats: { box: 5, lastPracticed: now },
        },
      ];

      // Run selection many times and count
      const counts: Record<string, number> = { low: 0, high: 0 };
      for (let i = 0; i < 100; i++) {
        const prisma = createMockPrisma(words);
        const result = await selectWords(prisma, 'user-1', 1);
        counts[result[0].id]++;
      }

      // Box 1 word should be selected significantly more often than box 5
      expect(counts.low).toBeGreaterThan(counts.high);
    });
  });

  describe('updateWordStats', () => {
    it('calls upsert for first practice (correct)', async () => {
      const prisma = createMockPrisma([]);
      await updateWordStats(prisma, 'word-1', 'user-1', true);

      expect(prisma.wordStats.upsert).toHaveBeenCalledWith({
        where: { wordId: 'word-1' },
        create: expect.objectContaining({
          wordId: 'word-1',
          userId: 'user-1',
          box: 2,
          successCount: 1,
          failCount: 0,
        }),
        update: expect.objectContaining({
          box: { increment: 1 },
          successCount: { increment: 1 },
        }),
      });
    });

    it('calls upsert for first practice (incorrect)', async () => {
      const prisma = createMockPrisma([]);
      await updateWordStats(prisma, 'word-1', 'user-1', false);

      expect(prisma.wordStats.upsert).toHaveBeenCalledWith({
        where: { wordId: 'word-1' },
        create: expect.objectContaining({
          box: 1,
          successCount: 0,
          failCount: 1,
        }),
        update: expect.objectContaining({
          box: 1,
          failCount: { increment: 1 },
        }),
      });
    });

    it('caps box at 5 via updateMany', async () => {
      const prisma = createMockPrisma([]);
      await updateWordStats(prisma, 'word-1', 'user-1', true);

      expect(prisma.wordStats.updateMany).toHaveBeenCalledWith({
        where: { wordId: 'word-1', box: { gt: 5 } },
        data: { box: 5 },
      });
    });

    it('resets to box 1 on incorrect', async () => {
      const prisma = createMockPrisma([]);
      await updateWordStats(prisma, 'word-1', 'user-1', false);

      expect(prisma.wordStats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            box: 1,
          }),
        }),
      );
    });
  });
});
