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
    "Search and retrieve Coralogix logs with AI-optimized formatting. Automatically detects query syntax (Lucene vs DataPrime) and returns structured, paginated results. Use this tool to investigate errors, trace issues, monitor applications, and analyze log patterns.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description:
          'Log search query. Supports both Lucene and DataPrime syntax.\n\nLucene examples:\n- "level:ERROR" (find error logs)\n- "exception timeout" (text search)\n- "application:payments AND status:500" (field combination)\n- "text:\\"connection failed\\"" (phrase search)\n\nDataPrime examples:\n- "source logs | filter level == \\"ERROR\\"" (structured query)\n- "source logs | filter timestamp >= now() - 1h | stats count() by application" (aggregation)',
      },
      timeframe: {
        type: "string",
        enum: ["15m", "1h", "6h", "24h", "custom"],
        default: "1h",
        description:
          'Time window for log search. Choose preset durations for common investigations:\n- "15m": Recent issues (last 15 minutes)\n- "1h": Standard troubleshooting (last hour) [DEFAULT]\n- "6h": Extended investigation (last 6 hours)\n- "24h": Daily analysis (last 24 hours)\n- "custom": Specific time range (requires startDate and endDate)',
      },
      startDate: {
        type: "string",
        description:
          'Start timestamp for custom time range in ISO 8601 format. Required when timeframe="custom".\nExample: "2024-01-15T10:00:00Z" (UTC timezone recommended)',
      },
      endDate: {
        type: "string",
        description:
          'End timestamp for custom time range in ISO 8601 format. Required when timeframe="custom".\nExample: "2024-01-15T11:00:00Z" (UTC timezone recommended)',
      },
      limit: {
        type: "integer",
        default: 20,
        minimum: 1,
        maximum: 50,
        description:
          "Maximum number of log entries to return per page. Optimized for AI processing:\n- Use 5-10 for focused analysis\n- Use 20 (default) for standard investigation\n- Use 50 for comprehensive data gathering",
      },
      page: {
        type: "integer",
        default: 1,
        minimum: 1,
        description:
          "Page number for pagination (1-based). Use sequential pagination to investigate large result sets:\n- Start with page 1 for initial results\n- Increment to explore more logs\n- Check 'hasNextPage' in response to continue",
      },
    },
    required: ["query"],
    additionalProperties: false,
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
