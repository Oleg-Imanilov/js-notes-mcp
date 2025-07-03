import { configDotenv } from "dotenv";
configDotenv();

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import McpServer from './mcp-server/mcp-server.js';

// Check for command line argument first, then environment variable, then default
let folder = process.argv[2] || process.env.NOTES_FOLDER || "./data";



try {
  const transport = new StdioServerTransport();
  const mcpServer = new McpServer(folder);
  await mcpServer.server.connect(transport);
} catch (error) {
  console.error("Failed to start server:", error);
  process.exit(1);
}
