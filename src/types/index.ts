import { FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface WordFilters extends PaginationQuery {
  language?: string;
  search?: string;
  tag?: string;
}

export interface CreateWordBody {
  word: string;
  definition: string;
  language: string;
  context_sentence?: string;
  tag_ids?: string[];
}

export interface UpdateWordBody {
  word?: string;
  definition?: string;
  language?: string;
  context_sentence?: string;
  tag_ids?: string[];
}

export interface CreateTagBody {
  name: string;
}

export interface UpdateTagBody {
  name: string;
}

export interface CreateSessionBody {
  word_ids?: string[];
  count?: number;
  language?: string;
  tag?: string;
}

export interface SubmitWritingBody {
  writing: string;
}

export interface WordWithTags {
  id: string;
  word: string;
  definition: string;
  language: string;
  context_sentence: string | null;
  user_id: string;
  created_at: Date;
  updated_at: Date;
  tags: { id: string; name: string }[];
}

export interface LLMEvaluationResult {
  overall_feedback: string;
  grammar_corrections: GrammarCorrection[];
  vocabulary_usage: VocabularyUsage[];
  score: number;
}

export interface GrammarCorrection {
  original: string;
  corrected: string;
  explanation: string;
}

export interface VocabularyUsage {
  word: string;
  used_correctly: boolean;
  feedback: string;
}
