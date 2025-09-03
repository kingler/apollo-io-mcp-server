/**
 * Standardized response interface for all Apollo MCP tools
 * This interface ensures consistent error handling and response format
 */

export interface IToolContent {
  readonly type: 'text';
  readonly text: string;
}

export interface IToolResponse {
  readonly content: IToolContent[];
  readonly isError?: boolean;
  readonly errorCode?: string;
  readonly requestId?: string;
}

export interface IToolResponseSuccess extends IToolResponse {
  readonly isError: false;
}

export interface IToolResponseError extends IToolResponse {
  readonly isError: true;
  readonly errorCode: string;
}

/**
 * Standard error codes for Apollo MCP Server
 */
export const ERROR_CODES = {
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_PARAMETERS: 'INVALID_PARAMETERS',
  API_ERROR: 'API_ERROR',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  MOCK_MODE: 'MOCK_MODE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Utility functions for creating standardized responses
 */
export class ToolResponseBuilder {
  static success(text: string, requestId?: string): IToolResponseSuccess {
    return {
      content: [{ type: 'text', text }],
      isError: false,
      requestId,
    };
  }

  static error(
    text: string,
    errorCode: ErrorCode,
    requestId?: string
  ): IToolResponseError {
    return {
      content: [{ type: 'text', text }],
      isError: true,
      errorCode,
      requestId,
    };
  }

  static mockResponse(
    mockData: string,
    requestId?: string
  ): IToolResponseSuccess {
    return {
      content: [{ type: 'text', text: `[MOCK MODE] ${mockData}` }],
      isError: false,
      requestId,
    };
  }
}