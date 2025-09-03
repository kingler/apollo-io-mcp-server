/**
 * Cloudflare Workers type extensions
 */

export interface Env {
  APOLLO_API_KEY: string;
  SESSIONS: KVNamespace;
  NODE_ENV: string;
  LOG_LEVEL: string;
  MCP_VERSION?: string;
}

// Re-export ExecutionContext for convenience
export type { ExecutionContext } from '@cloudflare/workers-types';