import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { ApolloAPIClient } from './apollo-api-client.js';
import type { IToolResponse } from './types/tool-response.js';
import { ToolResponseBuilder, ERROR_CODES } from './types/tool-response.js';

// Import all specialized tool handlers
import { LeadTools } from './tools/lead-tools.js';
import { ContactTools } from './tools/contact-tools.js';
import { SequenceTools } from './tools/sequence-tools.js';
import { DealTools } from './tools/deal-tools.js';
import { AnalyticsTools } from './tools/analytics-tools.js';

/**
 * Main orchestrator for all Apollo.io MCP tools
 * Coordinates between specialized tool handlers and maintains backward compatibility
 */
export class ApolloToolsOrchestrator {
  private readonly leadTools: LeadTools;
  private readonly contactTools: ContactTools;
  private readonly sequenceTools: SequenceTools;
  private readonly dealTools: DealTools;
  private readonly analyticsTools: AnalyticsTools;

  constructor(apiKey?: string) {
    // Initialize API client if key is available
    let apiClient: ApolloAPIClient | null = null;
    
    if (apiKey) {
      // Dynamic import to avoid circular dependencies
      import('./apollo-api-client.js').then(({ ApolloAPIClient }) => {
        apiClient = new ApolloAPIClient(apiKey);
      }).catch(error => {
        console.warn('Failed to initialize Apollo API client:', error);
      });
    } else {
      console.warn('APOLLO_API_KEY not set. Running in mock mode.');
    }

    // Initialize all specialized tool handlers
    const maxRequestsPerMinute = this.getMaxRequestsPerMinute();
    
    this.leadTools = new LeadTools(apiClient, maxRequestsPerMinute);
    this.contactTools = new ContactTools(apiClient, maxRequestsPerMinute);
    this.sequenceTools = new SequenceTools(apiClient, maxRequestsPerMinute);
    this.dealTools = new DealTools(apiClient, maxRequestsPerMinute);
    this.analyticsTools = new AnalyticsTools(apiClient, maxRequestsPerMinute);
  }

  /**
   * Main tool dispatch method - maintains backward compatibility with existing server.ts
   */
  public async handleToolCall(request: CallToolRequest): Promise<IToolResponse> {
    const { name, arguments: args } = request.params;

    if (!args) {
      return ToolResponseBuilder.error(
        'Missing required parameters',
        ERROR_CODES.INVALID_PARAMETERS
      );
    }

    try {
      return await this.dispatchTool(name, args);
    } catch (error) {
      return this.handleToolError(name, error);
    }
  }

  /**
   * Dispatch tool calls to appropriate handlers
   */
  private async dispatchTool(toolName: string, args: unknown): Promise<IToolResponse> {
    // Lead generation tools
    if (this.isLeadTool(toolName)) {
      return await this.callLeadTool(toolName, args);
    }

    // Contact management tools
    if (this.isContactTool(toolName)) {
      return await this.callContactTool(toolName, args);
    }

    // Sequence tools
    if (this.isSequenceTool(toolName)) {
      return await this.callSequenceTool(toolName, args);
    }

    // Deal tools
    if (this.isDealTool(toolName)) {
      return await this.callDealTool(toolName, args);
    }

    // Analytics tools
    if (this.isAnalyticsTool(toolName)) {
      return await this.callAnalyticsTool(toolName, args);
    }

    return ToolResponseBuilder.error(
      `Unknown tool: ${toolName}`,
      ERROR_CODES.INVALID_PARAMETERS
    );
  }

  private isLeadTool(name: string): boolean {
    return ['search-leads', 'search-organizations', 'bulk-enrich-contacts', 'bulk-enrich-organizations'].includes(name);
  }

  private isContactTool(name: string): boolean {
    return ['enrich-contact', 'create-contact', 'update-contact', 'search-contacts', 'get-account-data'].includes(name);
  }

  private isSequenceTool(name: string): boolean {
    return ['create-email-sequence', 'search-sequences', 'update-sequence', 'get-sequence-stats', 'add-contacts-to-sequence', 'remove-contacts-from-sequence'].includes(name);
  }

  private isDealTool(name: string): boolean {
    return ['create-deal', 'update-deal', 'search-deals'].includes(name);
  }

  private isAnalyticsTool(name: string): boolean {
    return ['track-engagement', 'search-news', 'search-job-postings', 'get-api-usage', 'create-task', 'log-call', 'search-tasks'].includes(name);
  }

  private async callLeadTool(name: string, args: unknown): Promise<IToolResponse> {
    switch (name) {
      case 'search-leads': return await this.leadTools.searchLeads(args);
      case 'search-organizations': return await this.leadTools.searchOrganizations(args);
      case 'bulk-enrich-contacts': return await this.leadTools.bulkEnrichContacts(args);
      case 'bulk-enrich-organizations': return await this.leadTools.bulkEnrichOrganizations(args);
      default: throw new Error(`Invalid lead tool: ${name}`);
    }
  }

  private async callContactTool(name: string, args: unknown): Promise<IToolResponse> {
    switch (name) {
      case 'enrich-contact': return await this.contactTools.enrichContact(args);
      case 'create-contact': return await this.contactTools.createContact(args);
      case 'update-contact': return await this.contactTools.updateContact(args);
      case 'search-contacts': return await this.contactTools.searchContacts(args);
      case 'get-account-data': return await this.contactTools.getAccountData(args);
      default: throw new Error(`Invalid contact tool: ${name}`);
    }
  }

  private async callSequenceTool(name: string, args: unknown): Promise<IToolResponse> {
    switch (name) {
      case 'create-email-sequence': return await this.sequenceTools.createEmailSequence(args);
      case 'search-sequences': return await this.sequenceTools.searchSequences(args);
      case 'update-sequence': return await this.sequenceTools.updateSequence(args);
      case 'get-sequence-stats': return await this.sequenceTools.getSequenceStats(args);
      case 'add-contacts-to-sequence': return await this.sequenceTools.addContactsToSequence(args);
      case 'remove-contacts-from-sequence': return await this.sequenceTools.removeContactsFromSequence(args);
      default: throw new Error(`Invalid sequence tool: ${name}`);
    }
  }

  private async callDealTool(name: string, args: unknown): Promise<IToolResponse> {
    switch (name) {
      case 'create-deal': return await this.dealTools.createDeal(args);
      case 'update-deal': return await this.dealTools.updateDeal(args);
      case 'search-deals': return await this.dealTools.searchDeals(args);
      default: throw new Error(`Invalid deal tool: ${name}`);
    }
  }

  private async callAnalyticsTool(name: string, args: unknown): Promise<IToolResponse> {
    switch (name) {
      case 'track-engagement': return await this.analyticsTools.trackEngagement(args);
      case 'search-news': return await this.analyticsTools.searchNews(args);
      case 'search-job-postings': return await this.analyticsTools.searchJobPostings(args);
      case 'get-api-usage': return await this.analyticsTools.getApiUsage(args);
      case 'create-task': return await this.analyticsTools.createTask(args);
      case 'log-call': return await this.analyticsTools.logCall(args);
      case 'search-tasks': return await this.analyticsTools.searchTasks(args);
      default: throw new Error(`Invalid analytics tool: ${name}`);
    }
  }

  private handleToolError(toolName: string, error: unknown): IToolResponse {
    console.error(`Error in tool ${toolName}:`, error);
    
    if (error instanceof Error) {
      if (error.message.includes('Rate limit exceeded')) {
        return ToolResponseBuilder.error(error.message, ERROR_CODES.RATE_LIMIT_EXCEEDED);
      } else if (error.message.includes('authentication')) {
        return ToolResponseBuilder.error(error.message, ERROR_CODES.AUTHENTICATION_FAILED);
      } else if (error.message.includes('Missing required')) {
        return ToolResponseBuilder.error(error.message, ERROR_CODES.INVALID_PARAMETERS);
      }
    }

    return ToolResponseBuilder.error(
      `Internal error in ${toolName}: ${error instanceof Error ? error.message : String(error)}`,
      ERROR_CODES.INTERNAL_ERROR
    );
  }

  /**
   * Get max requests per minute based on environment
   */
  private getMaxRequestsPerMinute(): number {
    // For testing environments, use more aggressive rate limiting
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
      return 3;
    }
    
    // Standard rate limiting for production
    return 60;
  }

  /**
   * Get list of all available tool names for server registration
   */
  public static getAvailableTools(): string[] {
    return [
      // Lead tools
      'search-leads',
      'search-organizations', 
      'bulk-enrich-contacts',
      'bulk-enrich-organizations',
      
      // Contact tools
      'enrich-contact',
      'create-contact',
      'update-contact',
      'search-contacts',
      'get-account-data',
      
      // Sequence tools
      'create-email-sequence',
      'search-sequences',
      'update-sequence',
      'get-sequence-stats',
      'add-contacts-to-sequence',
      'remove-contacts-from-sequence',
      
      // Deal tools
      'create-deal',
      'update-deal',
      'search-deals',
      
      // Analytics tools
      'track-engagement',
      'search-news',
      'search-job-postings',
      'get-api-usage',
      'create-task',
      'log-call',
      'search-tasks',
    ];
  }
}