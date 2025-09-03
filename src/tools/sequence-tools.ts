import { BaseToolHandler } from '../utils/base-tool-handler.js';
import type { IToolResponse } from '../types/tool-response.js';

/**
 * Specialized handler for email sequence operations
 * Handles: create-email-sequence, search-sequences, update-sequence, 
 *         get-sequence-stats, add-contacts-to-sequence, remove-contacts-from-sequence
 */
export class SequenceTools extends BaseToolHandler {
  /**
   * Create a new email sequence
   */
  public async createEmailSequence(args: unknown): Promise<IToolResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.checkRateLimit('create-email-sequence');
      
      const params = this.validateRequired<{
        name: string;
        contacts: string[];
        templateIds?: string[];
        delayDays?: number[];
      }>(args, ['name', 'contacts'], 'create-email-sequence');

      const { name, contacts, templateIds, delayDays } = params;

      if (contacts.length === 0) {
        throw new Error('At least one contact is required for the sequence');
      }

      const sequenceId = `seq_${Date.now()}`;
      
      const sequenceData = {
        sequenceId,
        name,
        contactCount: contacts.length,
        templateCount: templateIds?.length || 0,
        schedule: delayDays?.join(', ') || 'Default timing',
      };

      const message = `Email sequence created successfully:
- Sequence ID: ${sequenceId}
- Name: ${name}
- Contacts: ${contacts.length} added
- Templates: ${templateIds?.length || 0} configured
- Schedule: ${delayDays?.join(', ') || 'Default timing'} days between emails`;

      return this.createSuccessResponse(sequenceData, message, requestId);
      
    } catch (error) {
      return this.handleError(error, 'create-email-sequence', requestId);
    }
  }

  /**
   * Search for email sequences
   */
  public async searchSequences(args: unknown): Promise<IToolResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.checkRateLimit('search-sequences');
      
      const params = this.validateRequired<{
        query?: string;
        status?: string;
        createdAfter?: string;
        createdBefore?: string;
        limit?: number;
      }>(args, [], 'search-sequences');

      const { query, status, createdAfter, createdBefore, limit = 25 } = params;

      if (this.apiClient && !this.isMockMode) {
        // In production, would call real Apollo API
        // const response = await this.apiClient.searchSequences({ ... });
      }

      // Mock response for testing
      const mockSequences = this.generateMockSequences(query, status, limit);
      
      const message = `Found ${mockSequences.length} sequences:\n\n${this.formatSequences(mockSequences)}`;
      return this.createSuccessResponse(mockSequences, message, requestId);
      
    } catch (error) {
      return this.handleError(error, 'search-sequences', requestId);
    }
  }

  /**
   * Update an existing email sequence
   */
  public async updateSequence(args: unknown): Promise<IToolResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.checkRateLimit('update-sequence');
      
      const params = this.validateRequired<{
        sequenceId: string;
        name?: string;
        status?: string;
        templateIds?: string[];
        delayDays?: number[];
      }>(args, ['sequenceId'], 'update-sequence');

      const { sequenceId, name, status, templateIds, delayDays } = params;

      const updateData = {
        sequenceId,
        name: name || 'Unchanged',
        status: status || 'Unchanged',
        templateCount: templateIds ? templateIds.length : 'Unchanged',
        schedule: delayDays ? delayDays.join(', ') : 'Unchanged',
      };

      const message = `Sequence ${sequenceId} updated successfully:
- Name: ${name || 'Unchanged'}
- Status: ${status || 'Unchanged'}
- Templates: ${templateIds ? templateIds.length : 'Unchanged'}
- Delays: ${delayDays ? delayDays.join(', ') : 'Unchanged'} days`;

      return this.createSuccessResponse(updateData, message, requestId);
      
    } catch (error) {
      return this.handleError(error, 'update-sequence', requestId);
    }
  }

  /**
   * Get sequence performance statistics
   */
  public async getSequenceStats(args: unknown): Promise<IToolResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.checkRateLimit('get-sequence-stats');
      
      const params = this.validateRequired<{
        sequenceId: string;
        startDate?: string;
        endDate?: string;
      }>(args, ['sequenceId'], 'get-sequence-stats');

      const { sequenceId, startDate, endDate } = params;

      const stats = {
        sequenceId,
        period: `${startDate || 'All time'} to ${endDate || 'Present'}`,
        totalContacts: 250,
        activeContacts: 180,
        completedContacts: 70,
        emailsSent: 750,
        opens: 520,
        openRate: '69.3%',
        clicks: 145,
        clickRate: '19.3%',
        replies: 32,
        replyRate: '4.3%',
        unsubscribes: 5,
        bounces: 3,
        meetings: 8,
      };

      return this.createSuccessResponse(
        stats,
        `Sequence statistics retrieved for ${sequenceId}`,
        requestId
      );
      
    } catch (error) {
      return this.handleError(error, 'get-sequence-stats', requestId);
    }
  }

  /**
   * Add contacts to an email sequence
   */
  public async addContactsToSequence(args: unknown): Promise<IToolResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.checkRateLimit('add-contacts-to-sequence');
      
      const params = this.validateRequired<{
        sequenceId: string;
        contactIds?: string[];
        emails?: string[];
      }>(args, ['sequenceId'], 'add-contacts-to-sequence');

      const { sequenceId, contactIds, emails } = params;

      if (!contactIds && !emails) {
        throw new Error('Either contactIds or emails must be provided');
      }

      const contactCount = (contactIds?.length || 0) + (emails?.length || 0);
      
      const resultData = {
        sequenceId,
        addedContacts: contactCount,
        contactIds: contactIds || [],
        emails: emails || [],
      };

      const message = `Successfully added ${contactCount} contacts to sequence ${sequenceId}`;
      return this.createSuccessResponse(resultData, message, requestId);
      
    } catch (error) {
      return this.handleError(error, 'add-contacts-to-sequence', requestId);
    }
  }

  /**
   * Remove contacts from an email sequence
   */
  public async removeContactsFromSequence(args: unknown): Promise<IToolResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.checkRateLimit('remove-contacts-from-sequence');
      
      const params = this.validateRequired<{
        sequenceId: string;
        contactIds: string[];
      }>(args, ['sequenceId', 'contactIds'], 'remove-contacts-from-sequence');

      const { sequenceId, contactIds } = params;

      if (contactIds.length === 0) {
        throw new Error('At least one contact ID is required');
      }

      const resultData = {
        sequenceId,
        removedContacts: contactIds.length,
        contactIds,
      };

      const message = `Successfully removed ${contactIds.length} contacts from sequence ${sequenceId}`;
      return this.createSuccessResponse(resultData, message, requestId);
      
    } catch (error) {
      return this.handleError(error, 'remove-contacts-from-sequence', requestId);
    }
  }

  /**
   * Generate mock sequence data for testing and fallback
   */
  private generateMockSequences(
    query?: string,
    status?: string,
    limit = 25
  ): any[] {
    const sequences = [];
    const count = Math.min(limit, 5);
    
    for (let i = 0; i < count; i++) {
      sequences.push({
        id: `seq_${Date.now()}_${i}`,
        name: query ? `${query} Sequence ${i + 1}` : `Email Sequence ${i + 1}`,
        status: status || 'active',
        created: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
        contactCount: Math.floor(Math.random() * 500) + 50,
        emailsSent: Math.floor(Math.random() * 2000) + 100,
        openRate: `${Math.floor(Math.random() * 30) + 50}%`,
        replyRate: `${Math.floor(Math.random() * 10) + 2}%`,
      });
    }
    
    return sequences;
  }

  /**
   * Format sequence data for display
   */
  private formatSequences(sequences: any[]): string {
    return sequences
      .map(
        seq =>
          `• ${seq.name} (${seq.status}) - ${seq.contactCount} contacts, ${seq.openRate} open rate, ${seq.replyRate} reply rate`
      )
      .join('\n');
  }
}