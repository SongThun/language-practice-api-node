import { PrismaClient } from '@prisma/client';
import { evaluateWriting } from './llm';
import { updateWordStats } from './wordSelection';
import { LLMEvaluationResult } from '../types';
import { NotFoundError, ConflictError } from '../errors';

export async function evaluateSessionWriting(
  prisma: PrismaClient,
  sessionId: string,
  userId: string,
  writing: string,
): Promise<LLMEvaluationResult & { session_id: string }> {
  const session = await prisma.practiceSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      practiceResults: {
        include: {
          word: true,
        },
      },
    },
  });

  if (!session) {
    throw new NotFoundError('Session not found');
  }

  if (session.status === 'completed') {
    throw new ConflictError('Session already completed');
  }

  const words = session.practiceResults.map((pr) => ({
    id: pr.word.id,
    word: pr.word.word,
    definition: pr.word.definition,
    language: pr.word.language,
  }));

  const evaluation = await evaluateWriting(writing, words);

  const updatePromises: Promise<unknown>[] = [];

  for (const usage of evaluation.vocabulary_usage) {
    const wordEntry = words.find(
      (w) => w.word.toLowerCase() === usage.word.toLowerCase(),
    );
    if (!wordEntry) continue;

    const practiceResult = session.practiceResults.find(
      (pr) => pr.wordId === wordEntry.id,
    );
    if (!practiceResult) continue;

    updatePromises.push(
      prisma.practiceResult.update({
        where: { id: practiceResult.id },
        data: {
          isCorrect: usage.used_correctly,
          feedback: usage.feedback,
        },
      }),
    );

    updatePromises.push(
      updateWordStats(prisma, wordEntry.id, userId, usage.used_correctly),
    );
  }

  await Promise.all(updatePromises);

  await prisma.practiceSession.update({
    where: { id: sessionId },
    data: { status: 'completed' },
  });

  return {
    session_id: sessionId,
    ...evaluation,
  };
}
