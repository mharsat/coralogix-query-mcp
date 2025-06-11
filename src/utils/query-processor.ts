import { QuerySyntax, QueryContext, QueryLogsInput } from "../types/index.js";
import { MCP_LIMITS, TIMEFRAME_MAP } from "../config/limits.js";

export class QueryProcessor {
  /**
   * Detect query syntax based on query patterns
   */
  static detectQuerySyntax(query: string): QuerySyntax {
    // DataPrime queries typically contain pipe operators and specific keywords
    const dataPrimePatterns = [
      /\bsource\s+\w+\s*\|/i, // source logs |
      /\|\s*filter\b/i, // | filter
      /\|\s*limit\b/i, // | limit
      /\|\s*sort\b/i, // | sort
      /\|\s*choose\b/i, // | choose
      /\|\s*extract\b/i, // | extract
      /\|\s*groupby\b/i, // | groupby
      /\|\s*summarize\b/i, // | summarize
      /\s+contains\s+/i, // text contains
      /\s+startswith\s+/i, // text startswith
      /\s+endswith\s+/i, // text endswith
    ];

    // Check if query matches DataPrime patterns
    const isDataPrime = dataPrimePatterns.some((pattern) =>
      pattern.test(query)
    );

    return isDataPrime ? "dataprime" : "lucene";
  }

  /**
   * Build query context from input parameters
   */
  static buildQueryContext(input: QueryLogsInput): QueryContext {
    const now = new Date();
    let startTime: Date;
    let endTime: Date = now;

    if (input.timeframe && input.timeframe !== "custom") {
      const timeframeMs = TIMEFRAME_MAP[input.timeframe];
      startTime = new Date(now.getTime() - timeframeMs);
    } else if (input.startDate && input.endDate) {
      startTime = new Date(input.startDate);
      endTime = new Date(input.endDate);
    } else {
      // Default to 1 hour if no timeframe specified
      const defaultMs = TIMEFRAME_MAP["1h"];
      startTime = new Date(now.getTime() - defaultMs);
    }

    // Validate time range
    const maxTimeRange = MCP_LIMITS.MAX_TIME_WINDOW_HOURS * 60 * 60 * 1000;
    if (endTime.getTime() - startTime.getTime() > maxTimeRange) {
      throw new Error(
        `Time range cannot exceed ${MCP_LIMITS.MAX_TIME_WINDOW_HOURS} hours`
      );
    }

    // Validate and set limit
    const limit = Math.min(
      Math.max(input.limit || MCP_LIMITS.DEFAULT_LIMIT, MCP_LIMITS.MIN_LIMIT),
      MCP_LIMITS.MAX_LIMIT
    );

    return {
      originalQuery: input.query,
      detectedSyntax: this.detectQuerySyntax(input.query),
      timeRange: {
        start: startTime,
        end: endTime,
      },
      limit,
      includeArchive: this.shouldIncludeArchive(startTime, endTime),
    };
  }

  /**
   * Determine if archive should be included based on time range
   * Include archive for queries older than 24 hours
   */
  private static shouldIncludeArchive(
    startTime: Date,
    _endTime: Date
  ): boolean {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Include archive if start time is more than 24 hours ago
    return startTime.getTime() < oneDayAgo.getTime();
  }

  /**
   * Optimize query for better performance if needed
   */
  static optimizeQuery(query: string, syntax: QuerySyntax): string {
    if (syntax === "lucene") {
      return this.optimizeLuceneQuery(query);
    } else {
      return this.optimizeDataPrimeQuery(query);
    }
  }

  /**
   * Optimize Lucene queries
   */
  private static optimizeLuceneQuery(query: string): string {
    let optimized = query.trim();

    // Add common performance optimizations
    // If query is very broad, try to make it more specific
    if (optimized === "*" || optimized === "") {
      // Don't modify wildcard queries - let user be explicit
      return optimized;
    }

    // Ensure proper field syntax if plain text search
    if (
      !optimized.includes(":") &&
      !optimized.includes("(") &&
      !optimized.includes('"')
    ) {
      // Wrap in quotes for exact phrase matching to improve performance
      optimized = `"${optimized}"`;
    }

    return optimized;
  }

  /**
   * Optimize DataPrime queries
   */
  private static optimizeDataPrimeQuery(query: string): string {
    let optimized = query.trim();

    // Add limit if not already present
    if (!optimized.toLowerCase().includes("| limit")) {
      optimized = `${optimized} | limit ${MCP_LIMITS.MAX_LIMIT}`;
    }

    return optimized;
  }

  /**
   * Calculate pagination offset
   */
  static calculateOffset(page: number, limit: number): number {
    return Math.max(0, (page - 1) * limit);
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(
    page?: number,
    limit?: number
  ): { page: number; limit: number } {
    const validatedPage = Math.max(1, page || 1);
    const validatedLimit = Math.min(
      Math.max(limit || MCP_LIMITS.DEFAULT_LIMIT, MCP_LIMITS.MIN_LIMIT),
      MCP_LIMITS.MAX_LIMIT
    );

    if (validatedPage > MCP_LIMITS.MAX_PAGES) {
      throw new Error(`Page number cannot exceed ${MCP_LIMITS.MAX_PAGES}`);
    }

    return { page: validatedPage, limit: validatedLimit };
  }
}
