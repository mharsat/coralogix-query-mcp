// Coralogix API Types
export interface CoralogixQueryRequest {
  query: string;
  metadata: {
    syntax: "QUERY_SYNTAX_LUCENE" | "QUERY_SYNTAX_DATAPRIME";
    startDate: string; // ISO 8601 format
    endDate: string; // ISO 8601 format
    limit: number;
    includeArchive?: boolean;
  };
}

export interface CoralogixLogEntry {
  timestamp: string;
  severity: string;
  text: string;
  applicationName?: string;
  subsystemName?: string;
  computerName?: string;
  className?: string;
  methodName?: string;
  threadId?: string;
  category?: string;
  [key: string]: unknown; // Allow additional fields
}

export interface CoralogixQueryResponse {
  logs: CoralogixLogEntry[];
  total: number;
  hasMore?: boolean;
  nextPageToken?: string;
}

// MCP Tool Types
export interface QueryLogsInput {
  query: string;
  timeframe?: "15m" | "1h" | "6h" | "24h" | "custom";
  startDate?: string;
  endDate?: string;
  limit?: number;
  page?: number;
}

export interface ProcessedLogEntry {
  timestamp: string;
  severity: string;
  message: string;
  application?: string | undefined;
  subsystem?: string | undefined;
  host?: string | undefined;
  thread?: string | undefined;
  className?: string | undefined;
  methodName?: string | undefined;
  category?: string | undefined;
  additionalFields?: Record<string, unknown> | undefined;
}

export interface QueryLogsOutput {
  summary: {
    totalResults: number;
    resultsShown: number;
    timeRange: {
      start: string;
      end: string;
    };
    page: number;
    hasNextPage: boolean;
    queryType: "lucene" | "dataprime";
  };
  logs: ProcessedLogEntry[];
  pagination?: {
    currentPage: number;
    totalPages?: number;
    nextPageAvailable: boolean;
  };
}

// Configuration Types
export interface CoralogixConfig {
  apiKey: string;
  domain: string;
  baseUrl: string;
}

export interface ServerConfig {
  coralogix: CoralogixConfig;
  defaultTimeframe: string;
  maxRetries: number;
  requestTimeout: number;
}

// Query Processing Types
export type QuerySyntax = "lucene" | "dataprime";

export interface QueryContext {
  originalQuery: string;
  detectedSyntax: QuerySyntax;
  timeRange: {
    start: Date;
    end: Date;
  };
  limit: number;
  includeArchive: boolean;
}
