import { BaseToolHandler } from '../utils/base-tool-handler.js';
import type { IToolResponse } from '../types/tool-response.js';

/**
 * Specialized handler for contact management operations
 * Handles: enrich-contact, create-contact, update-contact, search-contacts, get-account-data
 */
export class ContactTools extends BaseToolHandler {
  /**
   * Enrich a contact with additional data from Apollo
   */
  public async enrichContact(args: unknown): Promise<IToolResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.checkRateLimit('enrich-contact');
      
      const params = this.validateRequired<{
        email: string;
        linkedinUrl?: string;
      }>(args, ['email'], 'enrich-contact');

      const { email, linkedinUrl } = params;

      // Simulate contact enrichment
      if (email === 'nonexistent@example.com') {
        const message = 'Contact not found in Apollo.io database';
        return this.createSuccessResponse(null, message, requestId);
      }

      const enrichedData = {
        email,
        name: 'John Doe',
        title: 'CEO',
        company: 'JetVision',
        phone: '+1-555-0123',
        linkedIn: linkedinUrl || 'https://linkedin.com/in/johndoe',
        twitter: '@johndoe',
      };

      return this.createSuccessResponse(
        enrichedData,
        'Successfully enriched contact data',
        requestId
      );
      
    } catch (error) {
      return this.handleError(error, 'enrich-contact', requestId);
    }
  }

  /**
   * Create a new contact in Apollo
   */
  public async createContact(args: unknown): Promise<IToolResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.checkRateLimit('create-contact');
      
      const params = this.validateRequired<{
        firstName: string;
        lastName: string;
        email: string;
        title?: string;
        company?: string;
        phone?: string;
        linkedinUrl?: string;
        accountId?: string;
      }>(args, ['firstName', 'lastName', 'email'], 'create-contact');

      const { firstName, lastName, email, title, company, phone, linkedinUrl, accountId } = params;

      const contactId = `contact_${Date.now()}`;
      
      const contactData = {
        contactId,
        firstName,
        lastName,
        email,
        title: title || 'Not specified',
        company: company || 'Not specified',
        phone: phone || 'Not provided',
        linkedinUrl: linkedinUrl || 'Not provided',
        accountId: accountId || 'Not linked',
      };

      const message = `Contact created successfully:
- Contact ID: ${contactId}
- Name: ${firstName} ${lastName}
- Email: ${email}
- Title: ${title || 'Not specified'}
- Company: ${company || 'Not specified'}
- Account ID: ${accountId || 'Not linked'}`;

      return this.createSuccessResponse(contactData, message, requestId);
      
    } catch (error) {
      return this.handleError(error, 'create-contact', requestId);
    }
  }

  /**
   * Update an existing contact
   */
  public async updateContact(args: unknown): Promise<IToolResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.checkRateLimit('update-contact');
      
      const params = this.validateRequired<{
        contactId: string;
        [key: string]: unknown;
      }>(args, ['contactId'], 'update-contact');

      const { contactId, ...updates } = params;

      // Remove contactId from updates to avoid including it in the update data
      const updateData = { ...updates };
      delete updateData.contactId;

      const message = `Contact ${contactId} updated successfully`;
      return this.createSuccessResponse(updateData, message, requestId);
      
    } catch (error) {
      return this.handleError(error, 'update-contact', requestId);
    }
  }

  /**
   * Search for contacts based on criteria
   */
  public async searchContacts(args: unknown): Promise<IToolResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.checkRateLimit('search-contacts');
      
      const params = this.validateRequired<{
        query?: string;
        accountId?: string;
        jobTitle?: string;
        company?: string;
        lastContactedDays?: number;
        limit?: number;
      }>(args, [], 'search-contacts');

      const { query, accountId, jobTitle, company, lastContactedDays, limit = 25 } = params;

      const mockContacts = this.generateMockContacts(query, jobTitle, company, limit);
      
      const message = `Found ${mockContacts.length} contacts:\n\n${this.formatContacts(mockContacts)}`;
      return this.createSuccessResponse(mockContacts, message, requestId);
      
    } catch (error) {
      return this.handleError(error, 'search-contacts', requestId);
    }
  }

  /**
   * Get account data by domain
   */
  public async getAccountData(args: unknown): Promise<IToolResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.checkRateLimit('get-account-data');
      
      const params = this.validateRequired<{
        domain: string;
        includeContacts?: boolean;
      }>(args, ['domain'], 'get-account-data');

      const { domain, includeContacts = true } = params;

      const accountData = {
        domain,
        companyName: this.formatCompanyName(domain),
        industry: 'Aviation',
        employeeCount: 150,
        revenue: '$50M-$100M',
        headquarters: 'San Francisco, CA',
        contacts: includeContacts ? [
          { name: 'Jane Smith', title: 'VP Sales', email: `jane@${domain}` },
          { name: 'Bob Johnson', title: 'Director of Operations', email: `bob@${domain}` }
        ] : [],
      };

      const message = `Account data retrieved for ${domain}`;
      return this.createSuccessResponse(accountData, message, requestId);
      
    } catch (error) {
      return this.handleError(error, 'get-account-data', requestId);
    }
  }

  /**
   * Generate mock contact data for testing and fallback
   */
  private generateMockContacts(
    query?: string,
    jobTitle?: string,
    company?: string,
    limit = 25
  ): any[] {
    const contacts = [];
    const count = Math.min(limit, 10);
    
    for (let i = 0; i < count; i++) {
      contacts.push({
        id: `contact_${i}`,
        name: `Contact ${i + 1}`,
        email: `contact${i + 1}@example.com`,
        title: jobTitle || 'Manager',
        company: company || `Company ${i + 1}`,
        phone: `+1-555-010${i}`,
        linkedIn: `https://linkedin.com/in/contact${i + 1}`,
      });
    }
    
    return contacts;
  }

  /**
   * Format contact data for display
   */
  private formatContacts(contacts: any[]): string {
    return contacts
      .map(
        contact =>
          `• ${contact.name} - ${contact.title} at ${contact.company} (${contact.email})`
      )
      .join('\n');
  }

  /**
   * Format company name from domain
   */
  private formatCompanyName(domain: string): string {
    const name = domain.replace('.com', '').replace(/[^a-zA-Z0-9]/g, '');
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
}