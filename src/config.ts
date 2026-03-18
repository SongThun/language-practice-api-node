import { strict as assert } from 'node:assert';

export interface AppConfig {
  port: number;
  host: string;
  supabaseUrl: string;
  supabaseKey: string;
  supabaseServiceRoleKey: string;
  databaseUrl: string;
  anthropicApiKey: string;
}

let _config: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (_config) return _config;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  assert(supabaseUrl, 'SUPABASE_URL is required');
  assert(supabaseKey, 'SUPABASE_KEY is required');
  assert(databaseUrl, 'DATABASE_URL is required');

  _config = {
    port: parseInt(process.env.PORT ?? '3001', 10),
    host: process.env.HOST ?? '0.0.0.0',
    supabaseUrl,
    supabaseKey,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    databaseUrl,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  };

  return _config;
}

/** Reset cached config (for testing). */
export function _resetConfig(): void {
  _config = null;
}
