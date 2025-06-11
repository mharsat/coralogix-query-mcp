#!/usr/bin/env node

// Load environment variables from .env file
import dotenv from "dotenv";
dotenv.config();

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { CoralogixClient } from "./utils/coralogix-client.js";
import { queryLogsTool, createQueryLogsHandler } from "./tools/query-logs.js";
import {
  logsSchemaToolSchema,
  createLogsSchemaHandler,
} from "./tools/logs-schema.js";
import { CORALOGIX_DOMAINS, type CoralogixDomain } from "./config/limits.js";
import { CoralogixConfig } from "./types/index.js";

class CoralogixMCPServer {
  private server: Server;
  private coralogixClient: CoralogixClient | null = null;

  constructor() {
    this.server = new Server(
      {
        name: "coralogix-query-mcp",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          queryLogsTool, // Original log querying tool
          logsSchemaToolSchema, // Schema discovery tool
        ],
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "query_logs": {
          if (!this.coralogixClient) {
            throw new Error(
              "Coralogix client not initialized. Please set CORALOGIX_API_KEY and CORALOGIX_DOMAIN environment variables."
            );
          }
          const handler = createQueryLogsHandler(this.coralogixClient);
          const result = await handler(args);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "get_logs_schema": {
          // Schema tool doesn't need Coralogix client - it's informational
          const handler = createLogsSchemaHandler();
          const result = await handler(args);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private initializeCoralogixClient(): void {
    const apiKey = process.env.CORALOGIX_API_KEY;
    const domain = process.env.CORALOGIX_DOMAIN as CoralogixDomain;

    if (!apiKey) {
      throw new Error(
        "CORALOGIX_API_KEY environment variable is required. " +
          "Get your API key from: https://coralogix.com/docs/personal-data-key/"
      );
    }

    if (!domain || !(domain in CORALOGIX_DOMAINS)) {
      const validDomains = Object.keys(CORALOGIX_DOMAINS).join(", ");
      throw new Error(
        `CORALOGIX_DOMAIN environment variable must be one of: ${validDomains}. ` +
          "See: https://coralogix.com/docs/management-api-endpoints/"
      );
    }

    const baseUrl = CORALOGIX_DOMAINS[domain];

    const config: CoralogixConfig = {
      apiKey,
      domain,
      baseUrl,
    };

    this.coralogixClient = new CoralogixClient(config);
  }

  async start(): Promise<void> {
    try {
      // Initialize Coralogix client
      this.initializeCoralogixClient();

      // Test connection
      if (this.coralogixClient) {
        console.error("Testing Coralogix connection...");
        const connectionOk = await this.coralogixClient.testConnection();
        if (!connectionOk) {
          console.error(
            "Warning: Failed to connect to Coralogix API. Please verify your API key and domain."
          );
        } else {
          console.error("✓ Coralogix connection successful");
        }
      }

      // Start server
      const transport = new StdioServerTransport();
      await this.server.connect(transport);

      console.error("🚀 Coralogix Query MCP Server running on stdio");
      console.error("📡 Ready to receive JSON-RPC requests via stdin/stdout");
      console.error(
        "🔧 For local testing, send JSON-RPC messages to this process"
      );
    } catch (error) {
      console.error("Failed to start server:", error);
      process.exit(1);
    }
  }
}

// Handle process signals gracefully
process.on("SIGINT", () => {
  console.error("Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.error("Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

// Start server
const server = new CoralogixMCPServer();
server.start().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});
