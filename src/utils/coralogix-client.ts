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

      if (!response.ok) {
        throw new Error(
          `Coralogix API error: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as CoralogixQueryResponse;
      return data;
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
