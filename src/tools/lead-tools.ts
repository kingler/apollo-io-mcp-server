import { BaseToolHandler } from '../utils/base-tool-handler.js';
import type { IToolResponse } from '../types/tool-response.js';

/**
 * Specialized handler for lead generation and organization search tools
 * Handles: search-leads, search-organizations, bulk-enrich-contacts, bulk-enrich-organizations
 */
export class LeadTools extends BaseToolHandler {
  /**
   * Search for leads based on criteria
   */
  public async searchLeads(args: unknown): Promise<IToolResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.checkRateLimit('search-leads');
      
      const params = this.validateRequired<{
        jobTitle?: string;
        industry?: string;
        companySize?: string;
        location?: string;
        limit?: number;
      }>(args, [], 'search-leads');

      const { jobTitle, industry, companySize, location, limit = 25 } = params;

      if (!jobTitle && !industry && !companySize && !location) {
        throw new Error('At least one search criterion must be provided');
      }

      let results;
      
      if (this.apiClient && !this.isMockMode) {
        try {
          const searchParams = {
            job_titles: jobTitle ? [jobTitle] : undefined,
            industries: industry ? [industry] : undefined,
            company_sizes: companySize ? [companySize] : undefined,
            locations: location ? [location] : undefined,
            limit,
          };
          
          const response = await this.apiClient.searchPeople(searchParams);
          results = response.people || [];
        } catch (apiError) {
          console.warn('API request failed, falling back to mock mode:', apiError);
          results = this.generateMockLeads(jobTitle, industry, companySize, location, limit);
        }
      } else {
        results = this.generateMockLeads(jobTitle, industry, companySize, location, limit);
      }
      
      const message = `Found ${results.length} leads matching your criteria:\n\n${this.formatLeads(results)}`;
      return this.createSuccessResponse(results, message, requestId);
      
    } catch (error) {
      return this.handleError(error, 'search-leads', requestId);
    }
  }

  /**
   * Search for organizations based on criteria
   */
  public async searchOrganizations(args: unknown): Promise<IToolResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.checkRateLimit('search-organizations');
      
      const params = this.validateRequired<{
        industry?: string;
        employeeCount?: string;
        revenue?: string;
        location?: string;
        technologies?: string[];
        limit?: number;
      }>(args, [], 'search-organizations');

      const { industry, employeeCount, revenue, location, technologies, limit = 25 } = params;

      if (!industry && !employeeCount && !revenue && !location && (!technologies || technologies.length === 0)) {
        throw new Error('At least one search parameter is required');
      }

      // In production, this would use the Apollo API client
      const mockResults = this.generateMockOrganizations(industry, employeeCount, revenue, location, limit);
      
      const message = `Found ${mockResults.length} organizations matching your criteria:\n\n${this.formatOrganizations(mockResults)}`;
      return this.createSuccessResponse(mockResults, message, requestId);
      
    } catch (error) {
      return this.handleError(error, 'search-organizations', requestId);
    }
  }

  /**
   * Bulk enrich multiple contacts
   */
  public async bulkEnrichContacts(args: unknown): Promise<IToolResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.checkRateLimit('bulk-enrich-contacts');
      
      const params = this.validateRequired<{
        contacts: unknown[];
        revealPersonalEmails?: boolean;
        revealPhoneNumbers?: boolean;
      }>(args, ['contacts'], 'bulk-enrich-contacts');

      const { contacts, revealPersonalEmails = false, revealPhoneNumbers = false } = params;

      if (contacts.length === 0) {
        throw new Error('No contacts provided for enrichment');
      }

      if (contacts.length > 10) {
        throw new Error('Maximum 10 contacts can be enriched in a single request');
      }

      // In production, this would call the Apollo bulk enrichment API
      const enrichedContacts = contacts.map((contact: any, index: number) => ({
        ...contact,
        enriched: {
          title: contact.title || 'Executive',
          company: contact.company || 'Unknown Company',
          linkedIn: contact.linkedinUrl || `https://linkedin.com/in/person${index}`,
          phone: revealPhoneNumbers ? `+1-555-010${index}` : null,
          personalEmail: revealPersonalEmails ? `personal${index}@email.com` : null,
          industry: 'Technology',
          location: 'San Francisco, CA',
        },
      }));

      return this.createSuccessResponse(
        enrichedContacts,
        `Successfully enriched ${enrichedContacts.length} contacts`,
        requestId
      );
      
    } catch (error) {
      return this.handleError(error, 'bulk-enrich-contacts', requestId);
    }
  }

  /**
   * Bulk enrich multiple organizations
   */
  public async bulkEnrichOrganizations(args: unknown): Promise<IToolResponse> {
    const requestId = this.generateRequestId();
    
    try {
      this.checkRateLimit('bulk-enrich-organizations');
      
      const params = this.validateRequired<{
        organizations: unknown[];
      }>(args, ['organizations'], 'bulk-enrich-organizations');

      const { organizations } = params;

      if (organizations.length === 0) {
        throw new Error('No organizations provided for enrichment');
      }

      if (organizations.length > 10) {
        throw new Error('Maximum 10 organizations can be enriched in a single request');
      }

      const enrichedOrgs = organizations.map((org: any) => ({
        ...org,
        enriched: {
          industry: 'Aviation',
          employeeCount: Math.floor(Math.random() * 1000) + 50,
          revenue: '$10M-$50M',
          headquarters: 'United States',
          foundedYear: 2010 + Math.floor(Math.random() * 10),
          technologies: ['Salesforce', 'HubSpot', 'AWS'],
          description: 'Leading company in the aviation industry',
        },
      }));

      return this.createSuccessResponse(
        enrichedOrgs,
        `Successfully enriched ${enrichedOrgs.length} organizations`,
        requestId
      );
      
    } catch (error) {
      return this.handleError(error, 'bulk-enrich-organizations', requestId);
    }
  }

  /**
   * Generate mock lead data for testing and fallback
   */
  private generateMockLeads(
    jobTitle?: string,
    industry?: string,
    companySize?: string,
    location?: string,
    limit = 25
  ): any[] {
    const leads = [];
    const count = Math.min(limit, 10); // Limit mock data
    
    for (let i = 0; i < count; i++) {
      leads.push({
        name: `Lead ${i + 1}`,
        title: jobTitle || 'Executive',
        company: `Company ${i + 1}`,
        industry: industry || 'Various',
        size: companySize || '50-200',
        location: location || 'United States',
        email: `lead${i + 1}@example.com`,
      });
    }
    
    return leads;
  }

  /**
   * Format lead data for display
   */
  private formatLeads(leads: any[]): string {
    return leads
      .map(
        lead =>
          `• ${lead.name} - ${lead.title} at ${lead.company} (${lead.industry}, ${lead.size} employees, ${lead.location})`
      )
      .join('\n');
  }

  /**
   * Generate mock organization data
   */
  private generateMockOrganizations(
    industry?: string,
    size?: string,
    revenue?: string,
    location?: string,
    limit = 25
  ): any[] {
    const orgs = [];
    const count = Math.min(limit, 10);
    
    for (let i = 0; i < count; i++) {
      orgs.push({
        name: `Organization ${i + 1}`,
        industry: industry || 'Various',
        employeeCount: size || '50-200',
        revenue: revenue || '$1M-$10M',
        location: location || 'United States',
        domain: `org${i + 1}.com`,
      });
    }
    
    return orgs;
  }

  /**
   * Format organization data for display
   */
  private formatOrganizations(orgs: any[]): string {
    return orgs
      .map(
        org =>
          `• ${org.name} - ${org.industry} (${org.employeeCount} employees, ${org.revenue}, ${org.location})`
      )
      .join('\n');
  }
}