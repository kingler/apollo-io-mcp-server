// Cloudflare Workers type definitions for environments that don't have them

declare global {
  interface KVNamespace {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: any): Promise<void>;
    delete(key: string): Promise<void>;
    list(options?: any): Promise<any>;
  }

  interface ExecutionContext {
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
  }

  interface Env {
    [key: string]: any;
    KV?: KVNamespace;
    APOLLO_API_KEY?: string;
    DATABASE_URL?: string;
    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    SESSIONS?: KVNamespace;
    NODE_ENV?: string;
    LOG_LEVEL?: string;
    MCP_VERSION?: string;
  }

  // Extend crypto interface for Cloudflare Workers
  interface Crypto {
    randomUUID(): string;
  }

  // Cloudflare Workers global
  declare var crypto: Crypto;
}

export {};