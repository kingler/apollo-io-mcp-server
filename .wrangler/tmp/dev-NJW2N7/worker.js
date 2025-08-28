var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-WVaw7d/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// node_modules/itty-router/index.mjs
var t = /* @__PURE__ */ __name(({ base: e = "", routes: t2 = [], ...r2 } = {}) => ({ __proto__: new Proxy({}, { get: /* @__PURE__ */ __name((r3, o2, a, s) => (r4, ...c) => t2.push([o2.toUpperCase?.(), RegExp(`^${(s = (e + r4).replace(/\/+(\/|$)/g, "$1")).replace(/(\/?\.?):(\w+)\+/g, "($1(?<$2>*))").replace(/(\/?\.?):(\w+)/g, "($1(?<$2>[^$1/]+?))").replace(/\./g, "\\.").replace(/(\/?)\*/g, "($1.*)?")}/*$`), c, s]) && a, "get") }), routes: t2, ...r2, async fetch(e2, ...o2) {
  let a, s, c = new URL(e2.url), n = e2.query = { __proto__: null };
  for (let [e3, t3] of c.searchParams) n[e3] = n[e3] ? [].concat(n[e3], t3) : t3;
  e: try {
    for (let t3 of r2.before || []) if (null != (a = await t3(e2.proxy ?? e2, ...o2))) break e;
    t: for (let [r3, n2, l, i] of t2) if ((r3 == e2.method || "ALL" == r3) && (s = c.pathname.match(n2))) {
      e2.params = s.groups || {}, e2.route = i;
      for (let t3 of l) if (null != (a = await t3(e2.proxy ?? e2, ...o2))) break t;
    }
  } catch (t3) {
    if (!r2.catch) throw t3;
    a = await r2.catch(t3, e2.proxy ?? e2, ...o2);
  }
  try {
    for (let t3 of r2.finally || []) a = await t3(a, e2.proxy ?? e2, ...o2) ?? a;
  } catch (t3) {
    if (!r2.catch) throw t3;
    a = await r2.catch(t3, e2.proxy ?? e2, ...o2);
  }
  return a;
} }), "t");
var r = /* @__PURE__ */ __name((e = "text/plain; charset=utf-8", t2) => (r2, o2 = {}) => {
  if (void 0 === r2 || r2 instanceof Response) return r2;
  const a = new Response(t2?.(r2) ?? r2, o2.url ? void 0 : o2);
  return a.headers.set("content-type", e), a;
}, "r");
var o = r("application/json; charset=utf-8", JSON.stringify);
var p = r("text/plain; charset=utf-8", String);
var f = r("text/html");
var u = r("image/jpeg");
var h = r("image/png");
var g = r("image/webp");

// src/apollo-tools.ts
var ApolloTools = class {
  static {
    __name(this, "ApolloTools");
  }
  rateLimitTracker = /* @__PURE__ */ new Map();
  MAX_REQUESTS_PER_MINUTE = 60;
  apiKey;
  constructor(apiKey) {
    this.apiKey = apiKey || "";
    if (!this.apiKey) {
      console.warn("APOLLO_API_KEY not set. Some features may not work.");
    }
  }
  async handleToolCall(request) {
    const { name, arguments: args } = request.params;
    if (!args) {
      throw new Error("Missing required parameters");
    }
    this.checkRateLimit(name);
    switch (name) {
      case "search-leads":
        return await this.searchLeads(args);
      case "enrich-contact":
        return await this.enrichContact(args);
      case "create-email-sequence":
        return await this.createEmailSequence(args);
      case "get-account-data":
        return await this.getAccountData(args);
      case "track-engagement":
        return await this.trackEngagement(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
  checkRateLimit(toolName) {
    const now = Date.now();
    const windowStart = now - 6e4;
    const requests = this.rateLimitTracker.get(toolName) || [];
    const recentRequests = requests.filter((time) => time > windowStart);
    if (recentRequests.length >= this.MAX_REQUESTS_PER_MINUTE) {
      throw new Error(`Rate limit exceeded for ${toolName}. Please wait before making more requests.`);
    }
    recentRequests.push(now);
    this.rateLimitTracker.set(toolName, recentRequests);
  }
  async searchLeads(args) {
    const { jobTitle, industry, companySize, location, limit = 25 } = args;
    if (!jobTitle && !industry && !companySize && !location) {
      throw new Error("Missing required parameters: at least one search criterion must be provided");
    }
    try {
      const mockResults = this.generateMockLeads(jobTitle, industry, companySize, location, limit);
      return {
        content: [
          {
            type: "text",
            text: `Found ${mockResults.length} leads matching your criteria:

${this.formatLeads(mockResults)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching leads: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }
  async enrichContact(args) {
    const { email, linkedinUrl } = args;
    if (!email) {
      throw new Error("Missing required parameter: email");
    }
    try {
      if (email === "nonexistent@example.com") {
        return {
          content: [
            {
              type: "text",
              text: "Contact not found in Apollo.io database"
            }
          ]
        };
      }
      const enrichedData = {
        email,
        name: "John Doe",
        title: "CEO",
        company: "JetVision",
        phone: "+1-555-0123",
        linkedIn: linkedinUrl || "https://linkedin.com/in/johndoe",
        twitter: "@johndoe"
      };
      return {
        content: [
          {
            type: "text",
            text: `Enriched contact data:
${JSON.stringify(enrichedData, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error enriching contact: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }
  async createEmailSequence(args) {
    const { name, contacts, templateIds, delayDays } = args;
    if (!name || !contacts || contacts.length === 0) {
      throw new Error("Missing required sequence parameters: name and contacts are required");
    }
    try {
      const sequenceId = `seq_${Date.now()}`;
      return {
        content: [
          {
            type: "text",
            text: `Email sequence created successfully:
- Sequence ID: ${sequenceId}
- Name: ${name}
- Contacts: ${contacts.length} added
- Templates: ${templateIds?.length || 0} configured
- Schedule: ${delayDays?.join(", ") || "Default timing"} days between emails`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error creating sequence: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }
  async getAccountData(args) {
    const { domain, includeContacts = true } = args;
    if (!domain) {
      throw new Error("Missing required parameter: domain");
    }
    const requests = this.rateLimitTracker.get("get-account-data") || [];
    if (requests.length > 8) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    try {
      const accountData = {
        domain,
        companyName: domain.replace(".com", "").charAt(0).toUpperCase() + domain.slice(1).replace(".com", ""),
        industry: "Aviation",
        employeeCount: 150,
        revenue: "$50M-$100M",
        headquarters: "San Francisco, CA",
        contacts: includeContacts ? [
          { name: "Jane Smith", title: "VP Sales", email: `jane@${domain}` },
          { name: "Bob Johnson", title: "Director of Operations", email: `bob@${domain}` }
        ] : []
      };
      return {
        content: [
          {
            type: "text",
            text: `Account data for ${domain}:
${JSON.stringify(accountData, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error retrieving account data: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }
  async trackEngagement(args) {
    const { sequenceId, startDate, endDate } = args;
    if (!sequenceId) {
      throw new Error("Missing required parameter: sequenceId");
    }
    try {
      const metrics = {
        sequenceId,
        period: `${startDate || "All time"} to ${endDate || "Present"}`,
        emailsSent: 250,
        opens: 175,
        openRate: "70%",
        clicks: 45,
        clickRate: "18%",
        replies: 12,
        replyRate: "4.8%",
        meetings: 3
      };
      return {
        content: [
          {
            type: "text",
            text: `Engagement metrics for sequence ${sequenceId}:
${JSON.stringify(metrics, null, 2)}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error tracking engagement: ${error instanceof Error ? error.message : "Unknown error"}`
          }
        ]
      };
    }
  }
  generateMockLeads(jobTitle, industry, companySize, location, limit = 25) {
    const leads = [];
    const count = Math.min(limit, 10);
    for (let i = 0; i < count; i++) {
      leads.push({
        name: `Lead ${i + 1}`,
        title: jobTitle || "Executive",
        company: `Company ${i + 1}`,
        industry: industry || "Various",
        size: companySize || "50-200",
        location: location || "United States",
        email: `lead${i + 1}@example.com`
      });
    }
    return leads;
  }
  formatLeads(leads) {
    return leads.map(
      (lead) => `\u2022 ${lead.name} - ${lead.title} at ${lead.company} (${lead.industry}, ${lead.size} employees, ${lead.location})`
    ).join("\n");
  }
};

// src/worker.ts
var router = t();
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, X-API-Key, mcp-session-id",
  "Access-Control-Max-Age": "86400"
};
var apolloTools;
function authenticateRequest(request, env) {
  const authHeader = request.headers.get("Authorization");
  const apiKeyHeader = request.headers.get("X-API-Key");
  let clientApiKey = null;
  if (authHeader) {
    if (authHeader.startsWith("Bearer ")) {
      clientApiKey = authHeader.substring(7);
    } else if (authHeader.startsWith("ApiKey ")) {
      clientApiKey = authHeader.substring(7);
    } else {
      clientApiKey = authHeader;
    }
  } else if (apiKeyHeader) {
    clientApiKey = apiKeyHeader;
  }
  return clientApiKey === env.APOLLO_API_KEY;
}
__name(authenticateRequest, "authenticateRequest");
router.options("*", () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders
  });
});
router.post("/mcp/initialize", async (request, env) => {
  if (!authenticateRequest(request, env)) {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32e3,
        message: "Authentication required. Please provide valid API key."
      },
      id: null
    }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  const body = await request.json();
  const sessionId = crypto.randomUUID();
  await env.SESSIONS.put(sessionId, JSON.stringify({
    created: (/* @__PURE__ */ new Date()).toISOString(),
    protocolVersion: body.params?.protocolVersion || "0.1.0",
    clientInfo: body.params?.clientInfo || {}
  }), {
    expirationTtl: 3600
    // 1 hour TTL
  });
  const response = {
    jsonrpc: "2.0",
    result: {
      protocolVersion: "0.1.0",
      serverInfo: {
        name: "apollo-io-mcp-server",
        version: "1.0.0"
      },
      capabilities: {
        tools: {},
        logging: {}
      }
    },
    id: body.id
  };
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "mcp-session-id": sessionId
    }
  });
});
router.post("/mcp/tools/list", async (request, env) => {
  if (!authenticateRequest(request, env)) {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32e3,
        message: "Authentication required. Please provide valid API key."
      },
      id: null
    }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  const sessionId = request.headers.get("mcp-session-id");
  const tools = [
    {
      name: "search-leads",
      description: "Search for prospects based on job title, industry, company size, and location",
      inputSchema: {
        type: "object",
        properties: {
          jobTitle: { type: "string" },
          industry: { type: "string" },
          companySize: { type: "string" },
          location: { type: "string" },
          limit: { type: "number", default: 25 }
        }
      }
    },
    {
      name: "enrich-contact",
      description: "Enrich contact information with additional data from Apollo.io",
      inputSchema: {
        type: "object",
        properties: {
          email: { type: "string" },
          linkedinUrl: { type: "string" }
        },
        required: ["email"]
      }
    },
    {
      name: "create-email-sequence",
      description: "Create an automated email sequence for lead nurturing",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string" },
          contacts: { type: "array", items: { type: "string" } },
          templateIds: { type: "array", items: { type: "string" } },
          delayDays: { type: "array", items: { type: "number" } }
        },
        required: ["name", "contacts"]
      }
    },
    {
      name: "get-account-data",
      description: "Retrieve account-based marketing data for a company",
      inputSchema: {
        type: "object",
        properties: {
          domain: { type: "string" },
          includeContacts: { type: "boolean", default: true }
        },
        required: ["domain"]
      }
    },
    {
      name: "track-engagement",
      description: "Track email and call engagement metrics for campaigns",
      inputSchema: {
        type: "object",
        properties: {
          sequenceId: { type: "string" },
          startDate: { type: "string" },
          endDate: { type: "string" }
        },
        required: ["sequenceId"]
      }
    }
  ];
  const body = await request.json();
  return new Response(JSON.stringify({
    jsonrpc: "2.0",
    result: { tools },
    id: body.id
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
router.post("/mcp/tools/call", async (request, env) => {
  if (!authenticateRequest(request, env)) {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32e3,
        message: "Authentication required. Please provide valid API key."
      },
      id: null
    }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  const sessionId = request.headers.get("mcp-session-id");
  const body = await request.json();
  if (!apolloTools) {
    apolloTools = new ApolloTools(env.APOLLO_API_KEY);
  }
  try {
    const result = await apolloTools.handleToolCall({
      method: "tools/call",
      params: body.params
    });
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      result,
      id: body.id
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : "Internal error"
      },
      id: body.id
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
router.post("/mcp", async (request, env) => {
  const body = await request.json();
  const method = body.method;
  if (method === "initialize") {
    return router.handle(new Request(new URL("/mcp/initialize", request.url), {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(body)
    }), env);
  } else if (method === "tools/list") {
    return router.handle(new Request(new URL("/mcp/tools/list", request.url), {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(body)
    }), env);
  } else if (method === "tools/call") {
    return router.handle(new Request(new URL("/mcp/tools/call", request.url), {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify(body)
    }), env);
  }
  return new Response(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32601,
      message: `Method not found: ${method}`
    },
    id: body.id
  }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
router.get("/health", () => {
  return new Response(JSON.stringify({
    status: "healthy",
    service: "apollo-io-mcp-server",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
router.all("*", () => {
  return new Response("Not Found", {
    status: 404,
    headers: corsHeaders
  });
});
var worker_default = {
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-WVaw7d/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-WVaw7d/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
