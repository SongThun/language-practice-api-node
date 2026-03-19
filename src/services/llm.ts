import Anthropic from '@anthropic-ai/sdk';
import { loadConfig } from '../config';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const config = loadConfig();
    client = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return client;
}

function buildVocabularyXml(
  words: { word: string; definition: string; language?: string }[],
): string {
  const entries = words
    .map((w) => {
      const langAttr = w.language ? ` language="${w.language}"` : '';
      return `<word${langAttr}><term>${w.word}</term><definition>${w.definition}</definition></word>`;
    })
    .join('\n');
  return `<vocabulary>\n${entries}\n</vocabulary>`;
}

export function parseJsonFromResponse<T = unknown>(text: string): T | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return null;
  }
  return JSON.parse(jsonMatch[0]) as T;
}

export async function generateExampleSentences(
  words: { word: string; definition: string; language: string }[],
): Promise<Map<string, string>> {
  const anthropic = getClient();

  const vocabularyXml = buildVocabularyXml(words);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Generate one natural example sentence for each of the following words/phrases.
The sentence should demonstrate proper usage and be helpful for a language learner.
Return ONLY a JSON object where keys are the words and values are the example sentences.

${vocabularyXml}`,
      },
    ],
  });

  const text =
    message.content[0].type === 'text' ? message.content[0].text : '';

  try {
    const parsed = parseJsonFromResponse<Record<string, string>>(text);
    if (!parsed) {
      return new Map();
    }
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

export async function evaluateWriting(
  writing: string,
  targetWords: { word: string; definition: string; language: string }[],
): Promise<{
  overall_feedback: string;
  grammar_corrections: { original: string; corrected: string; explanation: string }[];
  vocabulary_usage: { word: string; used_correctly: boolean; feedback: string }[];
  score: number;
}> {
  const anthropic = getClient();

  const vocabularyXml = buildVocabularyXml(targetWords);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: `You are a language tutor evaluating a student's writing practice.

The student was asked to write using these vocabulary words:
${vocabularyXml}

The student wrote:
<user_writing>
${writing}
</user_writing>

Evaluate the writing and return a JSON object with this exact structure:
{
  "overall_feedback": "Brief overall assessment",
  "grammar_corrections": [
    {"original": "incorrect text", "corrected": "correct text", "explanation": "why"}
  ],
  "vocabulary_usage": [
    {"word": "the word", "used_correctly": true/false, "feedback": "how it was used"}
  ],
  "score": 0-100
}

Return ONLY the JSON object, no other text.`,
      },
    ],
  });

  const text =
    message.content[0].type === 'text' ? message.content[0].text : '';

  try {
    const parsed = parseJsonFromResponse(text);
    if (!parsed) {
      throw new Error('No JSON found in response');
    }
    return parsed as {
      overall_feedback: string;
      grammar_corrections: { original: string; corrected: string; explanation: string }[];
      vocabulary_usage: { word: string; used_correctly: boolean; feedback: string }[];
      score: number;
    };
  } catch {
    return {
      overall_feedback: 'Unable to evaluate writing at this time.',
      grammar_corrections: [],
      vocabulary_usage: targetWords.map((w) => ({
        word: w.word,
        used_correctly: false,
        feedback: 'Could not evaluate',
      })),
      score: 0,
    };
  }
}

export function _resetClient(): void {
  client = null;
}
