# Coralogix Query MCP

A Model Context Protocol (MCP) server that provides AI-optimized access to Coralogix log querying capabilities. Designed to work seamlessly with AI agents while handling large log responses efficiently.

## Features

- **AI-Optimized Responses**: Intelligent log processing and truncation to prevent LLM context overflow
- **Schema Discovery**: Built-in schema information and field documentation for effective query construction
- **Automatic Query Detection**: Automatically detects and handles both Lucene and DataPrime query syntax
- **Smart Pagination**: Efficient pagination support for comprehensive log investigations
- **Response Processing**: Intelligent truncation of stack traces and large log messages
- **Archive Support**: Automatic archive inclusion for historical data queries
- **Retry Logic**: Built-in retry mechanisms with exponential backoff

## Installation

```bash
npm install -g coralogix-query-mcp
```

Or run directly with npx:

```bash
npx coralogix-query-mcp
```

## Configuration

The server requires two environment variables:

1. **CORALOGIX_API_KEY**: Your Coralogix personal API key

   - Get from: https://coralogix.com/docs/personal-data-key/

2. **CORALOGIX_DOMAIN**: Your Coralogix domain region
   - Options: `US1`, `US2`, `EU1`, `EU2`, `AP1`, `AP2`, `AP3`
   - See: https://coralogix.com/docs/management-api-endpoints/

### Environment Setup

For local development, copy the example environment file:

```bash
cp .env.example .env
```

Then edit `.env` with your actual values:

```bash
CORALOGIX_API_KEY=your_actual_api_key
CORALOGIX_DOMAIN=EU1
```

**Note**: The server will automatically load environment variables from `.env` file if present. You can also set environment variables directly in your shell or MCP client configuration.

## Usage with MCP Clients

### Cursor Integration

Add to your MCP settings in Cursor:

```json
{
  "mcpServers": {
    "coralogix": {
      "command": "npx",
      "args": ["coralogix-query-mcp"],
      "env": {
        "CORALOGIX_API_KEY": "your_api_key",
        "CORALOGIX_DOMAIN": "EU1"
      }
    }
  }
}
```

### Other MCP Clients

Configure your MCP client to run:

```bash
CORALOGIX_API_KEY=your_key CORALOGIX_DOMAIN=EU1 npx coralogix-query-mcp
```

## Available Tools

### `query_logs`

Query Coralogix logs with AI-optimized responses and pagination support.

**Parameters:**

- `query` (required): Search query string
  - Examples: `"level:ERROR"`, `"exception timeout"`, `"source logs | filter level == \"ERROR\""`
- `timeframe` (optional): Time window - `"15m"`, `"1h"`, `"6h"`, `"24h"`, or `"custom"`
  - Default: `"1h"`
- `startDate` (optional): Start date in ISO format (required if timeframe is "custom")
- `endDate` (optional): End date in ISO format (required if timeframe is "custom")
- `limit` (optional): Results per page (1-50, default: 20)
- `page` (optional): Page number for pagination (default: 1)

**Example Usage:**

```javascript
// Simple error search
await query_logs({
  query: "level:ERROR",
  timeframe: "1h",
});

// Complex DataPrime query
await query_logs({
  query: 'source logs | filter level == "ERROR" | limit 20',
  timeframe: "6h",
});
```

### `get_logs_schema`

Get comprehensive schema information for Coralogix logs including available fields, search examples, and query syntax tips.

**Parameters:**

- `includeExamples` (optional): Include practical query examples for common use cases (default: true)
- `includeAdvanced` (optional): Include advanced DataPrime operators and complex examples (default: false)

**Example Usage:**

```javascript
// Get basic schema with examples
await get_logs_schema({
  includeExamples: true,
  includeAdvanced: false,
});

// Get comprehensive schema with advanced features
await get_logs_schema({
  includeExamples: true,
  includeAdvanced: true,
});
```

**Response includes:**

- **commonFields**: Available log fields with types, descriptions, and examples
- **searchExamples**: Practical query examples for common use cases
- **queryTips**: Syntax tips for both Lucene and DataPrime
- **fieldAliases**: Alternative field names for convenience

## AI Agent Workflow

The tools work together to provide a comprehensive log analysis experience:

1. **Discovery**: Use `get_logs_schema` to understand available fields and query syntax
2. **Investigation**: Use `query_logs` to execute queries and analyze results
3. **Iteration**: Refine queries based on results and use pagination for comprehensive analysis

## Response Format

### Query Logs Response

```json
{
  "summary": {
    "totalResults": 150,
    "resultsShown": 20,
    "timeRange": {
      "start": "2024-01-15T10:00:00Z",
      "end": "2024-01-15T11:00:00Z"
    },
    "page": 1,
    "hasNextPage": true,
    "queryType": "lucene"
  },
  "logs": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "severity": "ERROR",
      "message": "Connection timeout after 30 seconds...",
      "application": "payments-service",
      "subsystem": "database",
      "host": "prod-server-01",
      "additionalFields": {
        "traceId": "abc123",
        "userId": "user456"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "nextPageAvailable": true
  }
}
```

## Limits and Optimization

- **Results per page**: 1-50 (default: 20, max: 50)
- **Time window**: Maximum 24 hours
- **Message length**: Truncated to 1000 characters with intelligent preservation
- **Stack traces**: Limited to 5 lines with key information preserved
- **Archive queries**: Automatically included for data older than 24 hours

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
git clone https://github.com/mharsat/coralogix-query-mcp.git
cd coralogix-query-mcp
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your actual Coralogix API key and domain
```

### Build

```bash
npm run build
```

### Development

```bash
npm run dev
```

### Testing

```bash
npm test
```

## Architecture

- **`src/types/`**: TypeScript type definitions
- **`src/config/`**: Configuration and limits
- **`src/utils/`**: Core utilities (HTTP client, query processing, response processing)
- **`src/tools/`**: MCP tool implementations
  - **`query-logs.ts`**: Main log querying functionality
  - **`logs-schema.ts`**: Schema discovery and documentation
- **`src/index.ts`**: Main server entry point

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Support

For issues and questions:

- GitHub Issues: https://github.com/mharsat/coralogix-query-mcp/issues
- Coralogix Documentation: https://coralogix.com/docs/
