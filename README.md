# Coralogix Query MCP

A Model Context Protocol (MCP) server that provides AI-optimized access to Coralogix log querying capabilities. Designed to work seamlessly with AI agents while handling large log responses efficiently.

## Features

- **AI-Optimized Responses**: Intelligent log processing and truncation to prevent LLM context overflow
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

Copy the example environment file:

```bash
cp example.env .env
```

Then edit `.env` with your actual values:

```bash
CORALOGIX_API_KEY=your_actual_api_key
CORALOGIX_DOMAIN=EU1
```

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

// Custom time range with pagination
await query_logs({
  query: "application:payments AND timeout",
  timeframe: "custom",
  startDate: "2024-01-15T10:00:00Z",
  endDate: "2024-01-15T11:00:00Z",
  limit: 30,
  page: 2,
});
```

## Response Format

The server returns structured, AI-optimized responses:

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
