import { PrismaClient } from '@prisma/client';
import { evaluateWriting } from './llm';
import { updateWordStats } from './wordSelection';
import { LLMEvaluationResult } from '../types';
import { NotFoundError, ConflictError } from '../errors';

/**
 * Orchestrates the writing evaluation flow:
 * 1. Fetch session and its words
 * 2. Call LLM for evaluation
 * 3. Store results in practice_results
 * 4. Update word_stats (Leitner boxes)
 * 5. Mark session as completed
 */
export async function evaluateSessionWriting(
  prisma: PrismaClient,
  sessionId: string,
  userId: string,
  writing: string,
): Promise<LLMEvaluationResult & { session_id: string }> {
  // Fetch session with its practice results (which have the word references)
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

  // Call LLM for evaluation
  const evaluation = await evaluateWriting(writing, words);

  // Update practice results and word stats in parallel
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

    // Update the practice result
    updatePromises.push(
      prisma.practiceResult.update({
        where: { id: practiceResult.id },
        data: {
          isCorrect: usage.used_correctly,
          feedback: usage.feedback,
        },
      }),
    );

    // Update Leitner box
    updatePromises.push(
      updateWordStats(prisma, wordEntry.id, userId, usage.used_correctly),
    );
  }

  await Promise.all(updatePromises);

  // Mark session as completed
  await prisma.practiceSession.update({
    where: { id: sessionId },
    data: { status: 'completed' },
  });

  return {
    session_id: sessionId,
    ...evaluation,
  };
}
