import { BaseToolHandler } from '../utils/base-tool-handler.js';
import type { IToolResponse } from '../types/tool-response.js';

/**
 * Specialized handler for deal management operations
 * Handles: create-deal, update-deal, search-deals
 */
export class DealTools extends BaseToolHandler {
  /**
   * Create a new deal
   */
  public async createDeal(args: unknown): Promise<IToolResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.checkRateLimit('create-deal');
      
      const params = this.validateRequired<{
        name: string;
        value: number;
        stage: string;
        contactId?: string;
        accountId?: string;
        closeDate?: string;
        probability?: number;
        description?: string;
      }>(args, ['name', 'value', 'stage'], 'create-deal');

      const {
        name,
        value,
        stage,
        contactId,
        accountId,
        closeDate,
        probability = 50,
        description,
      } = params;

      const dealId = `deal_${Date.now()}`;
      
      const dealData = {
        dealId,
        name,
        value,
        stage,
        contactId: contactId || 'Not specified',
        accountId: accountId || 'Not specified',
        closeDate: closeDate || 'Not set',
        probability,
        description: description || 'Not provided',
      };

      const message = `Deal created successfully:
- Deal ID: ${dealId}
- Name: ${name}
- Value: $${value}
- Stage: ${stage}
- Close Date: ${closeDate || 'Not set'}
- Probability: ${probability}%`;

      return this.createSuccessResponse(dealData, message, requestId);
      
    } catch (error) {
      return this.handleError(error, 'create-deal', requestId);
    }
  }

  /**
   * Update an existing deal
   */
  public async updateDeal(args: unknown): Promise<IToolResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.checkRateLimit('update-deal');
      
      const params = this.validateRequired<{
        dealId: string;
        [key: string]: unknown;
      }>(args, ['dealId'], 'update-deal');

      const { dealId, ...updates } = params;

      // Remove dealId from updates to avoid including it in the update data
      const updateData = { ...updates };
      delete updateData.dealId;

      const resultData = {
        dealId,
        updates: updateData,
        updatedAt: new Date().toISOString(),
      };

      const message = `Deal ${dealId} updated successfully`;
      return this.createSuccessResponse(resultData, message, requestId);
      
    } catch (error) {
      return this.handleError(error, 'update-deal', requestId);
    }
  }

  /**
   * Search for deals based on criteria
   */
  public async searchDeals(args: unknown): Promise<IToolResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.checkRateLimit('search-deals');
      
      const params = this.validateRequired<{
        stage?: string;
        minValue?: number;
        maxValue?: number;
        accountId?: string;
        contactId?: string;
        closeDateStart?: string;
        closeDateEnd?: string;
        limit?: number;
      }>(args, [], 'search-deals');

      const {
        stage,
        minValue,
        maxValue,
        accountId,
        contactId,
        closeDateStart,
        closeDateEnd,
        limit = 25,
      } = params;

      const mockDeals = this.generateMockDeals(stage, minValue, maxValue, limit);
      
      const message = `Found ${mockDeals.length} deals:\n\n${this.formatDeals(mockDeals)}`;
      return this.createSuccessResponse(mockDeals, message, requestId);
      
    } catch (error) {
      return this.handleError(error, 'search-deals', requestId);
    }
  }

  /**
   * Generate mock deal data for testing and fallback
   */
  private generateMockDeals(
    stage?: string,
    minValue?: number,
    maxValue?: number,
    limit = 25
  ): any[] {
    const deals = [];
    const count = Math.min(limit, 5);
    
    const stages = ['Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
    const dealNames = [
      'Enterprise Software License',
      'Aviation Equipment Purchase',
      'Consulting Services Agreement',
      'Fleet Management Solution',
      'Safety Training Program',
    ];
    
    for (let i = 0; i < count; i++) {
      const baseValue = minValue || 10000;
      const maxVal = maxValue || baseValue * 10;
      const value = baseValue + Math.random() * (maxVal - baseValue);
      
      deals.push({
        id: `deal_${Date.now()}_${i}`,
        name: dealNames[i] || `Deal ${i + 1}`,
        value: Math.round(value),
        stage: stage || stages[Math.floor(Math.random() * stages.length)],
        probability: Math.floor(Math.random() * 100),
        closeDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      });
    }
    
    return deals;
  }

  /**
   * Format deal data for display
   */
  private formatDeals(deals: any[]): string {
    return deals
      .map(
        deal =>
          `• ${deal.name} - $${deal.value.toLocaleString()} (${deal.stage}, ${deal.probability}% probability)`
      )
      .join('\n');
  }
}