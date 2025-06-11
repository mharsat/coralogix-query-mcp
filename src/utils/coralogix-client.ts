import {
  CoralogixQueryRequest,
  CoralogixQueryResponse,
  CoralogixConfig,
} from "../types/index.js";
import { MCP_LIMITS } from "../config/limits.js";

export class CoralogixClient {
  private config: CoralogixConfig;

  constructor(config: CoralogixConfig) {
    this.config = config;
  }

  /**
   * Query Coralogix logs using the Direct Lucene & DataPrime Query HTTP API
   */
  async queryLogs(
    request: CoralogixQueryRequest
  ): Promise<CoralogixQueryResponse> {
    const url = `${this.config.baseUrl}/api/v1/dataprime/query`;

    const requestOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(MCP_LIMITS.REQUEST_TIMEOUT_MS),
    };

    try {
      const response = await this.makeRequestWithRetry(url, requestOptions);

      // Get response text first to handle both JSON and non-JSON responses
      const responseText = await response.text();

      if (!response.ok) {
        // Log response details for debugging
        console.warn(`🔧 Coralogix API Response (${response.status}):`, {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          contentLength: responseText.length,
          contentPreview:
            responseText.substring(0, 200) +
            (responseText.length > 200 ? "..." : ""),
        });

        throw new Error(
          `Coralogix API error: ${response.status} ${
            response.statusText
          }. Response: ${responseText.substring(0, 500)}`
        );
      }

      // Try to parse as NDJSON (line-delimited JSON) - Coralogix streaming format
      try {
        // Split response into lines and parse each JSON object
        const lines = responseText
          .trim()
          .split("\n")
          .filter((line) => line.trim());
        const parsedObjects = lines.map((line) => JSON.parse(line));

        // Find the result object (usually the second line)
        const resultObject =
          parsedObjects.find((obj) => obj.result) ||
          parsedObjects.find((obj) => obj.logs);

        if (resultObject) {
          // Handle different response formats
          if (resultObject.result) {
            // New format: {"result": {"results": [...]}}
            const logs = resultObject.result.results || [];
            return {
              logs: logs,
              total: logs.length,
              hasMore: false,
              queryId: parsedObjects[0]?.queryId?.queryId || "unknown",
            } as CoralogixQueryResponse;
          } else if (resultObject.logs) {
            // Old format: {"logs": [...]}
            return resultObject as CoralogixQueryResponse;
          }
        }

        // If no result found, return empty response
        console.warn(`🔧 No result object found in NDJSON response:`, {
          lineCount: lines.length,
          parsedObjects: parsedObjects.map((obj) => Object.keys(obj)),
        });

        return {
          logs: [],
          total: 0,
          hasMore: false,
          queryId: parsedObjects[0]?.queryId?.queryId || "unknown",
        } as CoralogixQueryResponse;
      } catch (parseError) {
        console.warn(`🔧 NDJSON Parse Error:`, {
          parseError:
            parseError instanceof Error
              ? parseError.message
              : "Unknown parse error",
          responseLength: responseText.length,
          responsePreview: responseText.substring(0, 500),
          contentType: response.headers.get("content-type"),
          lines: responseText.trim().split("\n").length,
        });

        throw new Error(
          `Failed to parse Coralogix NDJSON response. Content-Type: ${response.headers.get(
            "content-type"
          )}, Lines: ${responseText.trim().split("\n").length}, Error: ${
            parseError instanceof Error ? parseError.message : "Unknown"
          }`
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to query Coralogix: ${error.message}`);
      }
      throw new Error("Unknown error occurred while querying Coralogix");
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequestWithRetry(
    url: string,
    options: RequestInit,
    retryCount = 0
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);

      // If rate limited or server error, retry
      if (
        (response.status === 429 || response.status >= 500) &&
        retryCount < MCP_LIMITS.MAX_RETRIES
      ) {
        const delay = MCP_LIMITS.RETRY_DELAY_MS * Math.pow(2, retryCount); // Exponential backoff
        await this.sleep(delay);
        return this.makeRequestWithRetry(url, options, retryCount + 1);
      }

      return response;
    } catch (error) {
      // Network errors - retry if we haven't exceeded max retries
      if (retryCount < MCP_LIMITS.MAX_RETRIES) {
        const delay = MCP_LIMITS.RETRY_DELAY_MS * Math.pow(2, retryCount);
        await this.sleep(delay);
        return this.makeRequestWithRetry(url, options, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Test connection to Coralogix API
   */
  async testConnection(): Promise<boolean> {
    try {
      // Simple query to test connection
      const testRequest: CoralogixQueryRequest = {
        query: "*",
        metadata: {
          syntax: "QUERY_SYNTAX_LUCENE",
          startDate: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
          endDate: new Date().toISOString(),
          limit: 1,
          includeArchive: false,
        },
      };

      await this.queryLogs(testRequest);
      return true;
    } catch {
      return false;
    }
  }
}
