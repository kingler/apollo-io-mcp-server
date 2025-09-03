import type { ApolloAPIClient } from '../apollo-api-client.js';
import type {
  IToolResponse,
  IToolResponseSuccess,
  IToolResponseError,
  ErrorCode,
} from '../types/tool-response.js';
import { ToolResponseBuilder, ERROR_CODES } from '../types/tool-response.js';

/**
 * Base class for all Apollo tool handlers
 * Provides common functionality like rate limiting, error handling, and mock responses
 */
export abstract class BaseToolHandler {
  protected readonly apiClient: ApolloAPIClient | null;
  private readonly rateLimitTracker: Map<string, number[]> = new Map();
  protected readonly maxRequestsPerMinute: number;
  protected readonly isMockMode: boolean;

  constructor(apiClient: ApolloAPIClient | null, maxRequestsPerMinute = 60) {
    this.apiClient = apiClient;
    this.maxRequestsPerMinute = maxRequestsPerMinute;
    this.isMockMode = apiClient === null;

    // For testing environments, use more aggressive rate limiting
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      this.maxRequestsPerMinute = 3;
    }
  }

  /**
   * Check rate limiting for the given tool name
   * Throws an error if rate limit is exceeded
   */
  protected checkRateLimit(toolName: string): void {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    if (!this.rateLimitTracker.has(toolName)) {
      this.rateLimitTracker.set(toolName, []);
    }

    const requests = this.rateLimitTracker.get(toolName)!;
    
    // Remove requests older than 1 minute
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    
    if (recentRequests.length >= this.maxRequestsPerMinute) {
      throw new Error(
        `Rate limit exceeded for ${toolName}. Maximum ${this.maxRequestsPerMinute} requests per minute allowed.`
      );
    }

    // Add current request
    recentRequests.push(now);
    this.rateLimitTracker.set(toolName, recentRequests);
  }

  /**
   * Handle errors consistently across all tools
   */
  protected handleError(error: unknown, toolName: string, requestId?: string): IToolResponseError {
    let errorMessage: string;
    let errorCode: ErrorCode;

    if (error instanceof Error) {
      if (error.message.includes('Rate limit exceeded')) {
        errorCode = ERROR_CODES.RATE_LIMIT_EXCEEDED;
        errorMessage = error.message;
      } else if (error.message.includes('authentication')) {
        errorCode = ERROR_CODES.AUTHENTICATION_FAILED;
        errorMessage = `Authentication failed for ${toolName}: ${error.message}`;
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorCode = ERROR_CODES.NETWORK_ERROR;
        errorMessage = `Network error in ${toolName}: ${error.message}`;
      } else {
        errorCode = ERROR_CODES.API_ERROR;
        errorMessage = `API error in ${toolName}: ${error.message}`;
      }
    } else {
      errorCode = ERROR_CODES.INTERNAL_ERROR;
      errorMessage = `Internal error in ${toolName}: ${String(error)}`;
    }

    console.error(`[${toolName}] Error:`, error);
    return ToolResponseBuilder.error(errorMessage, errorCode, requestId);
  }

  /**
   * Validate required parameters
   */
  protected validateRequired<T extends Record<string, unknown>>(
    params: unknown,
    requiredFields: Array<keyof T>,
    toolName: string
  ): T {
    if (!params || typeof params !== 'object') {
      throw new Error(`Invalid parameters for ${toolName}: expected object`);
    }

    const typedParams = params as T;
    
    for (const field of requiredFields) {
      if (!(field in typedParams) || typedParams[field] === null || typedParams[field] === undefined) {
        throw new Error(`Missing required parameter for ${toolName}: ${String(field)}`);
      }
    }

    return typedParams;
  }

  /**
   * Generate request ID for tracking
   */
  protected generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a success response with proper formatting
   */
  protected createSuccessResponse(
    data: unknown,
    message?: string,
    requestId?: string
  ): IToolResponseSuccess {
    const formattedMessage = message || 'Operation completed successfully';
    const responseText = `${formattedMessage}\n\n${JSON.stringify(data, null, 2)}`;
    
    return ToolResponseBuilder.success(responseText, requestId);
  }

  /**
   * Create a mock response when API client is not available
   */
  protected createMockResponse(
    mockData: unknown,
    toolName: string,
    requestId?: string
  ): IToolResponseSuccess {
    const mockMessage = `Mock response for ${toolName}:\n\n${JSON.stringify(mockData, null, 2)}`;
    return ToolResponseBuilder.mockResponse(mockMessage, requestId);
  }
}