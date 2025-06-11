/**
 * MCP-optimized limits and configuration constants
 * These limits are designed to work well with LLM context windows
 * and provide optimal user experience for AI agents
 */

export const MCP_LIMITS = {
  // Results - optimized for LLM context windows
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 50,
  MIN_LIMIT: 1,

  // Response processing - keep responses manageable
  MAX_MESSAGE_LENGTH: 1000, // Truncate very long log messages
  MAX_STACK_TRACE_LINES: 5, // Limit stack trace lines
  MAX_ERROR_CONTEXT: 300, // Limit error context length

  // Time windows - reasonable defaults for investigations
  DEFAULT_TIME_WINDOW_MINUTES: 60, // 1 hour default
  MAX_TIME_WINDOW_HOURS: 24, // 24 hours max

  // Pagination
  MAX_PAGES: 100, // Prevent infinite pagination

  // Performance
  REQUEST_TIMEOUT_MS: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000, // 1 second base delay
} as const;

export const CORALOGIX_LIMITS = {
  // Based on Coralogix API documentation
  API_DEFAULT_LIMIT: 2000,
  API_MAX_LIMIT: 12000,
  ARCHIVE_MAX_RESULTS: 50000,
  OPENSEARCH_MAX_RESULTS: 12000,
  OPENSEARCH_MAX_BYTES: 100 * 1024 * 1024, // 100MB
} as const;

export const TIMEFRAME_MAP = {
  "15m": 15 * 60 * 1000, // 15 minutes in ms
  "1h": 60 * 60 * 1000, // 1 hour in ms
  "6h": 6 * 60 * 60 * 1000, // 6 hours in ms
  "24h": 24 * 60 * 60 * 1000, // 24 hours in ms
} as const;

export const CORALOGIX_DOMAINS = {
  US1: "https://ng-api-http.coralogix.us",
  US2: "https://ng-api-http.cx498.coralogix.com",
  EU1: "https://ng-api-http.coralogix.com",
  EU2: "https://ng-api-http.eu2.coralogix.com",
  AP1: "https://ng-api-http.app.coralogix.in",
  AP2: "https://ng-api-http.coralogixsg.com",
  AP3: "https://ng-api-http.ap3.coralogix.com",
} as const;

export type CoralogixDomain = keyof typeof CORALOGIX_DOMAINS;
