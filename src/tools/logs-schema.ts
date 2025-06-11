import { Tool } from "@modelcontextprotocol/sdk/types.js";

/**
 * Schema information for Coralogix logs
 */
export interface LogsSchemaOutput {
  commonFields: {
    [fieldName: string]: {
      type: string;
      description: string;
      examples?: string[];
    };
  };
  searchExamples: {
    [category: string]: {
      description: string;
      luceneQuery: string;
      dataPrimeQuery?: string;
    };
  };
  queryTips: {
    lucene: string[];
    dataPrime: string[];
  };
  fieldAliases: {
    [alias: string]: string;
  };
}

/**
 * MCP Tool definition for getting Coralogix logs schema information
 */
export const logsSchemaToolSchema: Tool = {
  name: "get_logs_schema",
  description:
    "Get Coralogix log field schema and query syntax documentation. Essential for understanding available fields and constructing effective queries.",
  inputSchema: {
    type: "object",
    properties: {
      includeExamples: {
        type: "boolean",
        default: true,
        description: "Include practical query examples for common scenarios",
      },
      includeAdvanced: {
        type: "boolean",
        default: false,
        description:
          "Include advanced DataPrime operators and complex query patterns",
      },
    },
    additionalProperties: false,
  },
};

/**
 * Execute the get_logs_schema tool
 */
export async function executeLogsSchema(input: {
  includeExamples?: boolean;
  includeAdvanced?: boolean;
}): Promise<LogsSchemaOutput> {
  const { includeExamples = true, includeAdvanced = false } = input;

  const schema: LogsSchemaOutput = {
    commonFields: {
      timestamp: {
        type: "datetime",
        description: "Log entry timestamp in ISO format",
        examples: ["2024-01-15T10:30:00Z"],
      },
      severity: {
        type: "string",
        description: "Log level/severity",
        examples: ["ERROR", "WARN", "INFO", "DEBUG", "TRACE"],
      },
      text: {
        type: "text",
        description: "Main log message content",
        examples: [
          "Connection timeout after 30s",
          "User authentication failed",
        ],
      },
      applicationName: {
        type: "string",
        description: "Application or service name",
        examples: ["payments-service", "user-auth", "api-gateway"],
      },
      subsystemName: {
        type: "string",
        description: "Subsystem or component within the application",
        examples: ["database", "cache", "messaging", "http-client"],
      },
      computerName: {
        type: "string",
        description: "Host or server name where the log originated",
        examples: ["prod-server-01", "worker-node-3", "api-pod-xyz"],
      },
      className: {
        type: "string",
        description: "Class name (for structured logging)",
        examples: ["PaymentProcessor", "AuthController", "DatabaseConnection"],
      },
      methodName: {
        type: "string",
        description: "Method or function name",
        examples: ["processPayment", "validateUser", "executeQuery"],
      },
      threadId: {
        type: "string",
        description: "Thread identifier",
        examples: ["thread-1", "pool-2-thread-5"],
      },
      category: {
        type: "string",
        description: "Log category or logger name",
        examples: ["payment", "security", "performance", "audit"],
      },
      traceId: {
        type: "string",
        description: "Distributed tracing identifier",
        examples: ["abc123def456", "trace-uuid-here"],
      },
      userId: {
        type: "string",
        description: "User identifier (when available)",
        examples: ["user123", "admin@company.com"],
      },
      requestId: {
        type: "string",
        description: "Request correlation identifier",
        examples: ["req-abc123", "correlation-id-xyz"],
      },
    },

    searchExamples: includeExamples
      ? {
          errorLogs: {
            description: "Find error-level logs",
            luceneQuery: "severity:ERROR",
            dataPrimeQuery: 'source logs | filter severity == "ERROR"',
          },
          applicationErrors: {
            description: "Find errors from specific application",
            luceneQuery: "severity:ERROR AND applicationName:payments-service",
            dataPrimeQuery:
              'source logs | filter severity == "ERROR" and applicationName == "payments-service"',
          },
          timeRangeSearch: {
            description: "Search within specific time range",
            luceneQuery:
              "severity:ERROR AND timestamp:[2024-01-15T10:00:00Z TO 2024-01-15T11:00:00Z]",
            dataPrimeQuery:
              'source logs | filter severity == "ERROR" and timestamp >= "2024-01-15T10:00:00Z" and timestamp <= "2024-01-15T11:00:00Z"',
          },
          textSearch: {
            description: "Search log message content",
            luceneQuery: "text:timeout OR text:connection",
            dataPrimeQuery:
              'source logs | filter text contains "timeout" or text contains "connection"',
          },
          hostSpecific: {
            description: "Find logs from specific host",
            luceneQuery: "computerName:prod-server-01",
            dataPrimeQuery:
              'source logs | filter computerName == "prod-server-01"',
          },
          userActivity: {
            description: "Find logs for specific user",
            luceneQuery: "userId:user123",
            dataPrimeQuery: 'source logs | filter userId == "user123"',
          },
          traceFollowing: {
            description: "Follow distributed trace",
            luceneQuery: "traceId:abc123def456",
            dataPrimeQuery:
              'source logs | filter traceId == "abc123def456" | sort timestamp asc',
          },
          aggregations: {
            description: "Count errors by application",
            luceneQuery: "severity:ERROR", // Note: Lucene doesn't do aggregations in query
            dataPrimeQuery:
              'source logs | filter severity == "ERROR" | stats count() by applicationName | sort count desc',
          },
        }
      : {},

    queryTips: {
      lucene: [
        "Use field:value syntax for exact matches",
        'Use quotes for phrases: text:"connection timeout"',
        "Combine with AND, OR, NOT operators",
        "Use wildcards: applicationName:payment*",
        "Use ranges: timestamp:[now-1h TO now]",
        "Group with parentheses: (severity:ERROR OR severity:WARN) AND applicationName:api",
      ],
      dataPrime: includeAdvanced
        ? [
            "Use filter for WHERE-like conditions",
            "Chain operations with | (pipe)",
            "Use stats for aggregations: stats count() by field",
            "Use sort for ordering: sort timestamp desc",
            "Use limit to control result count: limit 100",
            "Use project to select specific fields: project timestamp, severity, text",
            "Use where for complex conditions",
            "Use group for complex aggregations",
            "Use join for combining datasets",
            "Use extract for parsing unstructured data",
          ]
        : [
            "Use filter for WHERE-like conditions",
            "Chain operations with | (pipe)",
            "Use stats for aggregations: stats count() by field",
            "Use sort for ordering: sort timestamp desc",
            "Use limit to control result count: limit 100",
          ],
    },

    fieldAliases: {
      level: "severity",
      message: "text",
      msg: "text",
      application: "applicationName",
      app: "applicationName",
      service: "applicationName",
      subsystem: "subsystemName",
      component: "subsystemName",
      host: "computerName",
      hostname: "computerName",
      server: "computerName",
      class: "className",
      method: "methodName",
      function: "methodName",
      thread: "threadId",
      trace: "traceId",
      user: "userId",
      request: "requestId",
      correlation: "requestId",
    },
  };

  return schema;
}

/**
 * Tool handler function that integrates with MCP server
 */
export function createLogsSchemaHandler() {
  return async (input: unknown): Promise<LogsSchemaOutput> => {
    // Validate input structure
    const schemaInput = (input || {}) as {
      includeExamples?: boolean;
      includeAdvanced?: boolean;
    };

    return executeLogsSchema(schemaInput);
  };
}
