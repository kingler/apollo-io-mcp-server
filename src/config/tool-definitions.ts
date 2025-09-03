/**
 * Centralized tool definitions for Apollo.io MCP Server
 * This configuration keeps tool schemas separate from server logic
 */

export const toolDefinitions = [
  // Lead Generation Tools
  {
    name: 'search-leads',
    description: 'Search for prospects based on job title, industry, company size, and location',
    inputSchema: {
      type: 'object',
      properties: {
        jobTitle: {
          type: 'string',
          description: 'Job title to search for (e.g., CEO, CFO, CTO)',
        },
        industry: {
          type: 'string',
          description: 'Industry sector (e.g., Aviation, Technology, Finance)',
        },
        companySize: {
          type: 'string',
          description: 'Company size range (e.g., 50-200, 200-500, 500+)',
        },
        location: {
          type: 'string',
          description: 'Geographic location (country, state, or city)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 25,
        },
      },
      required: [],
    },
  },
  {
    name: 'search-organizations',
    description: 'Search for companies based on industry, size, revenue, and location',
    inputSchema: {
      type: 'object',
      properties: {
        industry: {
          type: 'string',
          description: 'Industry sector to search for',
        },
        employeeCount: {
          type: 'string',
          description: 'Employee count range (e.g., 50-200)',
        },
        revenue: {
          type: 'string',
          description: 'Revenue range (e.g., $1M-$10M)',
        },
        location: {
          type: 'string',
          description: 'Geographic location',
        },
        technologies: {
          type: 'array',
          items: { type: 'string' },
          description: 'Technologies used by the company',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results',
          default: 25,
        },
      },
      required: [],
    },
  },
  {
    name: 'bulk-enrich-contacts',
    description: 'Enrich multiple contacts with additional data (max 10 contacts)',
    inputSchema: {
      type: 'object',
      properties: {
        contacts: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of contact objects to enrich',
        },
        revealPersonalEmails: {
          type: 'boolean',
          description: 'Whether to reveal personal email addresses',
          default: false,
        },
        revealPhoneNumbers: {
          type: 'boolean',
          description: 'Whether to reveal phone numbers',
          default: false,
        },
      },
      required: ['contacts'],
    },
  },
  {
    name: 'bulk-enrich-organizations',
    description: 'Enrich multiple organizations with additional data (max 10 organizations)',
    inputSchema: {
      type: 'object',
      properties: {
        organizations: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of organization objects to enrich',
        },
      },
      required: ['organizations'],
    },
  },

  // Contact Management Tools
  {
    name: 'enrich-contact',
    description: 'Enrich contact information with additional data from Apollo.io',
    inputSchema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'Email address of the contact to enrich',
        },
        linkedinUrl: {
          type: 'string',
          description: 'LinkedIn profile URL (optional)',
        },
      },
      required: ['email'],
    },
  },
  {
    name: 'create-contact',
    description: 'Create a new contact in Apollo.io',
    inputSchema: {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          description: 'First name of the contact',
        },
        lastName: {
          type: 'string',
          description: 'Last name of the contact',
        },
        email: {
          type: 'string',
          description: 'Email address of the contact',
        },
        title: {
          type: 'string',
          description: 'Job title',
        },
        company: {
          type: 'string',
          description: 'Company name',
        },
        phone: {
          type: 'string',
          description: 'Phone number',
        },
        linkedinUrl: {
          type: 'string',
          description: 'LinkedIn profile URL',
        },
        accountId: {
          type: 'string',
          description: 'Associated account ID',
        },
      },
      required: ['firstName', 'lastName', 'email'],
    },
  },
  {
    name: 'update-contact',
    description: 'Update an existing contact',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'ID of the contact to update',
        },
      },
      required: ['contactId'],
      additionalProperties: true,
    },
  },
  {
    name: 'search-contacts',
    description: 'Search for existing contacts',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        accountId: {
          type: 'string',
          description: 'Filter by account ID',
        },
        jobTitle: {
          type: 'string',
          description: 'Filter by job title',
        },
        company: {
          type: 'string',
          description: 'Filter by company',
        },
        lastContactedDays: {
          type: 'number',
          description: 'Filter by days since last contact',
        },
        limit: {
          type: 'number',
          description: 'Maximum results',
          default: 25,
        },
      },
      required: [],
    },
  },
  {
    name: 'get-account-data',
    description: 'Retrieve account-based marketing data for a company',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Company domain (e.g., example.com)',
        },
        includeContacts: {
          type: 'boolean',
          description: 'Include contact information in the response',
          default: true,
        },
      },
      required: ['domain'],
    },
  },

  // Email Sequence Tools
  {
    name: 'create-email-sequence',
    description: 'Create an automated email sequence for lead nurturing',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the email sequence',
        },
        contacts: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of contact emails to add to the sequence',
        },
        templateIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of email template IDs to use in the sequence',
        },
        delayDays: {
          type: 'array',
          items: { type: 'number' },
          description: 'Days to wait between each email',
        },
      },
      required: ['name', 'contacts'],
    },
  },
  {
    name: 'search-sequences',
    description: 'Search for email sequences',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        status: {
          type: 'string',
          description: 'Filter by sequence status',
        },
        createdAfter: {
          type: 'string',
          description: 'Filter sequences created after this date',
        },
        createdBefore: {
          type: 'string',
          description: 'Filter sequences created before this date',
        },
        limit: {
          type: 'number',
          description: 'Maximum results',
          default: 25,
        },
      },
      required: [],
    },
  },
  {
    name: 'update-sequence',
    description: 'Update an existing email sequence',
    inputSchema: {
      type: 'object',
      properties: {
        sequenceId: {
          type: 'string',
          description: 'ID of the sequence to update',
        },
        name: {
          type: 'string',
          description: 'New name for the sequence',
        },
        status: {
          type: 'string',
          description: 'New status for the sequence',
        },
        templateIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Updated template IDs',
        },
        delayDays: {
          type: 'array',
          items: { type: 'number' },
          description: 'Updated delay days',
        },
      },
      required: ['sequenceId'],
    },
  },
  {
    name: 'get-sequence-stats',
    description: 'Get performance statistics for an email sequence',
    inputSchema: {
      type: 'object',
      properties: {
        sequenceId: {
          type: 'string',
          description: 'ID of the sequence',
        },
        startDate: {
          type: 'string',
          description: 'Start date for statistics',
        },
        endDate: {
          type: 'string',
          description: 'End date for statistics',
        },
      },
      required: ['sequenceId'],
    },
  },
  {
    name: 'add-contacts-to-sequence',
    description: 'Add contacts to an email sequence',
    inputSchema: {
      type: 'object',
      properties: {
        sequenceId: {
          type: 'string',
          description: 'ID of the sequence',
        },
        contactIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of contact IDs to add',
        },
        emails: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of email addresses to add',
        },
      },
      required: ['sequenceId'],
    },
  },
  {
    name: 'remove-contacts-from-sequence',
    description: 'Remove contacts from an email sequence',
    inputSchema: {
      type: 'object',
      properties: {
        sequenceId: {
          type: 'string',
          description: 'ID of the sequence',
        },
        contactIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of contact IDs to remove',
        },
      },
      required: ['sequenceId', 'contactIds'],
    },
  },

  // Deal Management Tools
  {
    name: 'create-deal',
    description: 'Create a new sales deal',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the deal',
        },
        value: {
          type: 'number',
          description: 'Deal value in dollars',
        },
        stage: {
          type: 'string',
          description: 'Current stage of the deal',
        },
        contactId: {
          type: 'string',
          description: 'Associated contact ID',
        },
        accountId: {
          type: 'string',
          description: 'Associated account ID',
        },
        closeDate: {
          type: 'string',
          description: 'Expected close date',
        },
        probability: {
          type: 'number',
          description: 'Probability of closing (0-100)',
          default: 50,
        },
        description: {
          type: 'string',
          description: 'Deal description',
        },
      },
      required: ['name', 'value', 'stage'],
    },
  },
  {
    name: 'update-deal',
    description: 'Update an existing deal',
    inputSchema: {
      type: 'object',
      properties: {
        dealId: {
          type: 'string',
          description: 'ID of the deal to update',
        },
      },
      required: ['dealId'],
      additionalProperties: true,
    },
  },
  {
    name: 'search-deals',
    description: 'Search for deals',
    inputSchema: {
      type: 'object',
      properties: {
        stage: {
          type: 'string',
          description: 'Filter by deal stage',
        },
        minValue: {
          type: 'number',
          description: 'Minimum deal value',
        },
        maxValue: {
          type: 'number',
          description: 'Maximum deal value',
        },
        accountId: {
          type: 'string',
          description: 'Filter by account ID',
        },
        contactId: {
          type: 'string',
          description: 'Filter by contact ID',
        },
        closeDateStart: {
          type: 'string',
          description: 'Filter deals closing after this date',
        },
        closeDateEnd: {
          type: 'string',
          description: 'Filter deals closing before this date',
        },
        limit: {
          type: 'number',
          description: 'Maximum results',
          default: 25,
        },
      },
      required: [],
    },
  },

  // Analytics and Task Management Tools
  {
    name: 'track-engagement',
    description: 'Track email and call engagement metrics for campaigns',
    inputSchema: {
      type: 'object',
      properties: {
        sequenceId: {
          type: 'string',
          description: 'ID of the sequence to track',
        },
        startDate: {
          type: 'string',
          description: 'Start date for tracking period',
        },
        endDate: {
          type: 'string',
          description: 'End date for tracking period',
        },
      },
      required: ['sequenceId'],
    },
  },
  {
    name: 'search-news',
    description: 'Search for news articles related to organizations or industries',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for news articles',
        },
        organizationId: {
          type: 'string',
          description: 'Filter by specific organization',
        },
        industry: {
          type: 'string',
          description: 'Filter by industry',
        },
        startDate: {
          type: 'string',
          description: 'Start date for news articles',
        },
        endDate: {
          type: 'string',
          description: 'End date for news articles',
        },
        limit: {
          type: 'number',
          description: 'Maximum results',
          default: 25,
        },
      },
      required: [],
    },
  },
  {
    name: 'search-job-postings',
    description: 'Search for job postings at target companies',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query for job postings',
        },
        company: {
          type: 'string',
          description: 'Filter by company name',
        },
        location: {
          type: 'string',
          description: 'Filter by location',
        },
        jobTitle: {
          type: 'string',
          description: 'Filter by job title',
        },
        department: {
          type: 'string',
          description: 'Filter by department',
        },
        limit: {
          type: 'number',
          description: 'Maximum results',
          default: 25,
        },
      },
      required: [],
    },
  },
  {
    name: 'get-api-usage',
    description: 'Get API usage statistics and credit consumption',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Start date for usage statistics',
        },
        endDate: {
          type: 'string',
          description: 'End date for usage statistics',
        },
      },
      required: [],
    },
  },
  {
    name: 'create-task',
    description: 'Create a new task or reminder',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Task title',
        },
        description: {
          type: 'string',
          description: 'Task description',
        },
        dueDate: {
          type: 'string',
          description: 'Due date for the task',
        },
        priority: {
          type: 'string',
          description: 'Task priority (Low, Medium, High, Urgent)',
          default: 'Medium',
        },
        contactId: {
          type: 'string',
          description: 'Associated contact ID',
        },
        accountId: {
          type: 'string',
          description: 'Associated account ID',
        },
        dealId: {
          type: 'string',
          description: 'Associated deal ID',
        },
        type: {
          type: 'string',
          description: 'Task type (Call, Email, Meeting, etc.)',
        },
      },
      required: ['title', 'dueDate'],
    },
  },
  {
    name: 'log-call',
    description: 'Log a call activity with a contact',
    inputSchema: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'ID of the contact',
        },
        callOutcome: {
          type: 'string',
          description: 'Outcome of the call',
        },
        callNotes: {
          type: 'string',
          description: 'Notes from the call',
        },
        callDuration: {
          type: 'number',
          description: 'Duration of the call in minutes',
        },
        followUpRequired: {
          type: 'boolean',
          description: 'Whether follow-up is required',
          default: false,
        },
        callDate: {
          type: 'string',
          description: 'Date of the call',
        },
      },
      required: ['contactId'],
    },
  },
  {
    name: 'search-tasks',
    description: 'Search for tasks',
    inputSchema: {
      type: 'object',
      properties: {
        assignedTo: {
          type: 'string',
          description: 'Filter by assigned user',
        },
        status: {
          type: 'string',
          description: 'Filter by task status',
        },
        dueDateStart: {
          type: 'string',
          description: 'Filter tasks due after this date',
        },
        dueDateEnd: {
          type: 'string',
          description: 'Filter tasks due before this date',
        },
        contactId: {
          type: 'string',
          description: 'Filter by contact ID',
        },
        accountId: {
          type: 'string',
          description: 'Filter by account ID',
        },
        dealId: {
          type: 'string',
          description: 'Filter by deal ID',
        },
        priority: {
          type: 'string',
          description: 'Filter by priority',
        },
        type: {
          type: 'string',
          description: 'Filter by task type',
        },
        limit: {
          type: 'number',
          description: 'Maximum results',
          default: 25,
        },
      },
      required: [],
    },
  },
];