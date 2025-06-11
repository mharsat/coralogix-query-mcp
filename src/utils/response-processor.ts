import {
  CoralogixLogEntry,
  ProcessedLogEntry,
  QueryLogsOutput,
  QueryContext,
} from "../types/index.js";
import { MCP_LIMITS } from "../config/limits.js";

export class ResponseProcessor {
  /**
   * Process raw Coralogix logs into AI-optimized format
   */
  static processLogs(
    logs: CoralogixLogEntry[],
    context: QueryContext,
    page: number,
    totalResults?: number
  ): QueryLogsOutput {
    const processedLogs = logs.map((log) => this.processLogEntry(log));

    return {
      summary: {
        totalResults: totalResults || logs.length,
        resultsShown: processedLogs.length,
        timeRange: {
          start: context.timeRange.start.toISOString(),
          end: context.timeRange.end.toISOString(),
        },
        page,
        hasNextPage: logs.length === context.limit, // Heuristic: if we got a full page, there might be more
        queryType: context.detectedSyntax,
      },
      logs: processedLogs,
      pagination: {
        currentPage: page,
        nextPageAvailable: logs.length === context.limit,
      },
    };
  }

  /**
   * Process individual log entry for AI consumption
   */
  private static processLogEntry(log: CoralogixLogEntry): ProcessedLogEntry {
    return {
      timestamp: log.timestamp,
      severity: this.normalizeSeverity(log.severity),
      message: this.processMessage(log.text),
      application: log.applicationName,
      subsystem: log.subsystemName,
      host: log.computerName,
      thread: log.threadId,
      className: log.className,
      methodName: log.methodName,
      category: log.category,
      additionalFields: this.extractAdditionalFields(log),
    };
  }

  /**
   * Normalize severity levels to standard format
   */
  private static normalizeSeverity(severity: string): string {
    const normalizedSeverity = severity?.toUpperCase().trim();

    // Map various severity formats to standard levels
    const severityMap: Record<string, string> = {
      TRACE: "TRACE",
      DEBUG: "DEBUG",
      INFO: "INFO",
      INFORMATION: "INFO",
      WARN: "WARN",
      WARNING: "WARN",
      ERROR: "ERROR",
      ERR: "ERROR",
      FATAL: "FATAL",
      CRITICAL: "FATAL",
      CRIT: "FATAL",
    };

    return severityMap[normalizedSeverity] || normalizedSeverity || "UNKNOWN";
  }

  /**
   * Process and truncate log messages for AI consumption
   */
  private static processMessage(text: string): string {
    if (!text) return "";

    let processed = text.trim();

    // If message is longer than limit, intelligently truncate
    if (processed.length > MCP_LIMITS.MAX_MESSAGE_LENGTH) {
      processed = this.intelligentTruncate(processed);
    }

    return processed;
  }

  /**
   * Intelligently truncate messages while preserving important information
   */
  private static intelligentTruncate(text: string): string {
    const maxLength = MCP_LIMITS.MAX_MESSAGE_LENGTH;

    // If it looks like a stack trace, preserve the important parts
    if (this.isStackTrace(text)) {
      return this.truncateStackTrace(text);
    }

    // For other long messages, try to preserve beginning and end
    if (text.length > maxLength) {
      const preserveStart = Math.floor(maxLength * 0.7); // 70% for start
      const preserveEnd = maxLength - preserveStart - 10; // 10 chars for " ... "

      return `${text.substring(0, preserveStart)} ... ${text.substring(
        text.length - preserveEnd
      )}`;
    }

    return text;
  }

  /**
   * Check if text appears to be a stack trace
   */
  private static isStackTrace(text: string): boolean {
    const stackTracePatterns = [
      /at\s+[\w\$\.<>]+\([^)]*\)/, // Java stack trace
      /^\s*at\s+/m, // General "at" pattern
      /File\s+"[^"]+",\s+line\s+\d+/i, // Python stack trace
      /^\s*\w+Error:/m, // Error with type
      /^\s*Caused by:/m, // Java caused by
      /^\s*\.\.\.\s+\d+\s+more/m, // Java "... X more"
    ];

    return stackTracePatterns.some((pattern) => pattern.test(text));
  }

  /**
   * Truncate stack traces while preserving key information
   */
  private static truncateStackTrace(text: string): string {
    const lines = text.split("\n");
    const maxLines = MCP_LIMITS.MAX_STACK_TRACE_LINES;

    // Always keep the first line (usually the error message)
    const errorLine = lines[0] || "";

    // Keep the first few stack trace lines
    const stackLines = lines.slice(1, maxLines);

    // If there are more lines, add indication
    const remainingLines = lines.length - maxLines;
    const truncatedStack = stackLines.join("\n");

    if (remainingLines > 0) {
      return `${errorLine}\n${truncatedStack}\n... and ${remainingLines} more lines`;
    }

    return `${errorLine}\n${truncatedStack}`;
  }

  /**
   * Extract additional fields while filtering out standard ones
   */
  private static extractAdditionalFields(
    log: CoralogixLogEntry
  ): Record<string, unknown> | undefined {
    const standardFields = new Set([
      "timestamp",
      "severity",
      "text",
      "applicationName",
      "subsystemName",
      "computerName",
      "className",
      "methodName",
      "threadId",
      "category",
    ]);

    const additionalFields: Record<string, unknown> = {};
    let hasAdditionalFields = false;

    for (const [key, value] of Object.entries(log)) {
      if (!standardFields.has(key) && value !== undefined && value !== null) {
        // Truncate long field values
        if (
          typeof value === "string" &&
          value.length > MCP_LIMITS.MAX_ERROR_CONTEXT
        ) {
          additionalFields[key] = `${value.substring(
            0,
            MCP_LIMITS.MAX_ERROR_CONTEXT
          )}...`;
        } else {
          additionalFields[key] = value;
        }
        hasAdditionalFields = true;
      }
    }

    return hasAdditionalFields ? additionalFields : undefined;
  }

  /**
   * Create summary statistics for a set of logs
   */
  static generateLogSummary(
    logs: ProcessedLogEntry[]
  ): Record<string, unknown> {
    const severityCounts = logs.reduce((acc, log) => {
      acc[log.severity] = (acc[log.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const applicationCounts = logs.reduce((acc, log) => {
      if (log.application) {
        acc[log.application] = (acc[log.application] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return {
      totalLogs: logs.length,
      severityBreakdown: severityCounts,
      topApplications: Object.entries(applicationCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .reduce((acc, [app, count]) => {
          acc[app] = count;
          return acc;
        }, {} as Record<string, number>),
      timeRange:
        logs.length > 0
          ? {
              earliest: logs[0]?.timestamp,
              latest: logs[logs.length - 1]?.timestamp,
            }
          : undefined,
    };
  }
}
