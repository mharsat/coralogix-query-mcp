import { Tool } from "@modelcontextprotocol/sdk/types.js";
import {
  QueryLogsInput,
  QueryLogsOutput,
  CoralogixQueryRequest,
} from "../types/index.js";
import { CoralogixClient } from "../utils/coralogix-client.js";
import { QueryProcessor } from "../utils/query-processor.js";
import { ResponseProcessor } from "../utils/response-processor.js";

/**
 * MCP Tool definition for querying Coralogix logs
 */
export const queryLogsTool: Tool = {
  name: "query_logs",
  description:
    "Query Coralogix logs with AI-optimized responses and pagination support. Automatically detects query syntax (Lucene vs DataPrime) and includes intelligent response processing.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          'Search query. Examples: "level:ERROR", "exception timeout", "application:payments AND status:500", "source logs | filter level == \\"ERROR\\""',
      },
      timeframe: {
        type: "string",
        enum: ["15m", "1h", "6h", "24h", "custom"],
        default: "1h",
        description:
          'Time window to search. Use "custom" with startDate/endDate for specific ranges.',
      },
      startDate: {
        type: "string",
        description:
          'Start date in ISO format (required if timeframe is "custom"). Example: "2024-01-15T10:00:00Z"',
      },
      endDate: {
        type: "string",
        description:
          'End date in ISO format (required if timeframe is "custom"). Example: "2024-01-15T11:00:00Z"',
      },
      limit: {
        type: "integer",
        default: 20,
        minimum: 1,
        maximum: 50,
        description:
          "Number of results per page (max 50 for optimal MCP performance)",
      },
      page: {
        type: "integer",
        default: 1,
        minimum: 1,
        description:
          "Page number for pagination. Use pagination for comprehensive investigations.",
      },
    },
    required: ["query"],
  },
};

/**
 * Implementation of the query_logs tool
 */
export async function executeQueryLogs(
  input: QueryLogsInput,
  coralogixClient: CoralogixClient
): Promise<QueryLogsOutput> {
  try {
    // Validate and build query context
    const context = QueryProcessor.buildQueryContext(input);
    const { page, limit } = QueryProcessor.validatePagination(
      input.page,
      input.limit
    );

    // Calculate offset for pagination
    const offset = QueryProcessor.calculateOffset(page, limit);

    // Optimize query for better performance
    const optimizedQuery = QueryProcessor.optimizeQuery(
      context.originalQuery,
      context.detectedSyntax
    );

    // Build Coralogix API request
    const coralogixRequest: CoralogixQueryRequest = {
      query: optimizedQuery,
      metadata: {
        syntax:
          context.detectedSyntax === "lucene"
            ? "QUERY_SYNTAX_LUCENE"
            : "QUERY_SYNTAX_DATAPRIME",
        startDate: context.timeRange.start.toISOString(),
        endDate: context.timeRange.end.toISOString(),
        limit: limit + offset, // Request more to handle pagination
        includeArchive: context.includeArchive,
      },
    };

    // Execute query
    const response = await coralogixClient.queryLogs(coralogixRequest);

    // Handle cases where logs might be undefined or null
    const logs = response.logs || [];

    // Apply pagination to results
    const paginatedLogs = logs.slice(offset, offset + limit);

    // Process response for AI consumption
    const processedResponse = ResponseProcessor.processLogs(
      paginatedLogs,
      context,
      page,
      response.total
    );

    return processedResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to query logs: ${error.message}`);
    }
    throw new Error("Unknown error occurred while querying logs");
  }
}

/**
 * Tool handler function that integrates with MCP server
 */
export function createQueryLogsHandler(coralogixClient: CoralogixClient) {
  return async (input: unknown): Promise<QueryLogsOutput> => {
    // Validate input structure
    if (!input || typeof input !== "object" || !("query" in input)) {
      throw new Error("Invalid input: query parameter is required");
    }

    const queryInput = input as QueryLogsInput;

    // Validate required fields
    if (!queryInput.query || typeof queryInput.query !== "string") {
      throw new Error("Invalid input: query must be a non-empty string");
    }

    // Validate custom timeframe requirements
    if (queryInput.timeframe === "custom") {
      if (!queryInput.startDate || !queryInput.endDate) {
        throw new Error(
          'startDate and endDate are required when timeframe is "custom"'
        );
      }

      // Validate date formats
      try {
        new Date(queryInput.startDate);
        new Date(queryInput.endDate);
      } catch {
        throw new Error(
          "startDate and endDate must be valid ISO 8601 date strings"
        );
      }
    }

    return executeQueryLogs(queryInput, coralogixClient);
  };
}
