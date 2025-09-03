import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  LoggingMessageNotification,
  InitializeRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import { ApolloToolsOrchestrator } from './apollo-tools-orchestrator.js';
import { toolDefinitions } from './config/tool-definitions.js';

const SESSION_ID_HEADER_NAME = 'mcp-session-id';
const JSON_RPC = '2.0';

/**
 * Refactored MCP Server with improved maintainability and reduced complexity
 * Uses modular tool orchestrator and externalized configuration
 */
export class MCPServer {
  public readonly server: Server;
  public readonly transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
  private readonly apolloOrchestrator: ApolloToolsOrchestrator;

  constructor(server: Server, apiKey?: string) {
    this.server = server;
    this.apolloOrchestrator = new ApolloToolsOrchestrator(apiKey);
    this.setupToolHandlers();
  }

  /**
   * Handle GET requests for SSE streaming
   */
  public async handleGetRequest(req: Request, res: Response): Promise<void> {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    
    if (!sessionId || !this.transports[sessionId]) {
      res.status(400).json(
        this.createErrorResponse('Bad Request: invalid session ID or method.')
      );
      return;
    }

    console.log(`Establishing SSE stream for session ${sessionId}`);
    const transport = this.transports[sessionId];
    await transport.handleRequest(req, res);
    await this.streamMessages(transport);
  }

  /**
   * Handle POST requests for MCP communication
   */
  public async handlePostRequest(req: Request, res: Response): Promise<void> {
    const sessionId = req.headers[SESSION_ID_HEADER_NAME] as string | undefined;

    try {
      // Reuse existing transport
      if (sessionId && this.transports[sessionId]) {
        const transport = this.transports[sessionId];
        await transport.handleRequest(req, res, req.body);
        return;
      }

      // Create new transport for initialization
      if (!sessionId && this.isInitializeRequest(req.body)) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });

        await this.server.connect(transport);
        await transport.handleRequest(req, res, req.body);

        // Store transport if session ID is available
        const newSessionId = transport.sessionId;
        if (newSessionId) {
          this.transports[newSessionId] = transport;
        }
        return;
      }

      res.status(400).json(
        this.createErrorResponse('Bad Request: invalid session ID or method.')
      );
    } catch (error) {
      console.error('Error handling MCP request:', error);
      res.status(500).json(this.createErrorResponse('Internal server error.'));
    }
  }

  /**
   * Clean up server resources
   */
  public async cleanup(): Promise<void> {
    await this.server.close();
  }

  /**
   * Setup tool handlers using the new orchestrator
   */
  private setupToolHandlers(): void {
    // Register tool list handler
    this.server.setRequestHandler(
      'tools/list' as any,
      async () => ({
        tools: toolDefinitions,
      })
    );

    // Register tool call handler using the orchestrator
    this.server.setRequestHandler(
      'tools/call' as any,
      async (request) => {
        try {
          return await this.apolloOrchestrator.handleToolCall(request);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Tool call error: ${errorMessage}`);
          throw new Error(errorMessage);
        }
      }
    );
  }

  /**
   * Stream messages for SSE connection
   */
  private async streamMessages(transport: StreamableHTTPServerTransport): Promise<void> {
    try {
      const message: LoggingMessageNotification = {
        method: 'notifications/message',
        params: { level: 'info', data: 'SSE Connection established' },
      };

      await transport.send(message);
      
      // Set up periodic heartbeat
      const heartbeatInterval = setInterval(async () => {
        try {
          const heartbeat: LoggingMessageNotification = {
            method: 'notifications/message',
            params: { level: 'debug', data: 'Heartbeat' },
          };
          await transport.send(heartbeat);
        } catch (error) {
          console.error('Heartbeat error:', error);
          clearInterval(heartbeatInterval);
        }
      }, 30000); // 30 seconds

      // Clean up on transport close
      transport.onClose(() => {
        clearInterval(heartbeatInterval);
        console.log('SSE connection closed');
      });
      
    } catch (error) {
      console.error('Error streaming messages:', error);
    }
  }

  /**
   * Check if request is an initialization request
   */
  private isInitializeRequest(body: unknown): boolean {
    if (!body || typeof body !== 'object') return false;
    
    const request = body as Record<string, unknown>;
    return request.method === 'initialize';
  }

  /**
   * Create standardized error response
   */
  private createErrorResponse(message: string): { jsonrpc: string; error: { code: number; message: string } } {
    return {
      jsonrpc: JSON_RPC,
      error: {
        code: -32603, // Internal error
        message,
      },
    };
  }
}