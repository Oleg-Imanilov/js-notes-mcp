import { configDotenv } from "dotenv";
configDotenv();

import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import express from 'express';
import { randomUUID } from 'crypto';

import McpServer from './mcp-server/mcp-server.js';

let folder = process.argv[2] || process.env.NOTES_FOLDER || "./data";


// Create Express app
const app = express();

// Map to store transports by session ID
const transports = {};

// Track active sessions for cleanup
const activeSessions = new Map();

// Configure CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, mcp-session-id');
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400');
    res.status(200).end();
    return;
  }
  
  console.log(req.method, req.url, req.body ? JSON.stringify(req.body) : '');

  next();
});

// Configure Express to parse JSON
app.use(express.json({ limit: '10mb' }));

// Create HTTP server
const PORT = process.env.PORT || 3000;

// Handle POST requests for client-to-server communication
app.post('/mcp', async (req, res) => {
  try {
    // Check for existing session ID
    const sessionId = req.headers['mcp-session-id'];
    let transport;

    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      transport = transports[sessionId];
      console.log(`Reusing existing transport for session: ${sessionId}`);
      
      // Update session activity
      if (activeSessions.has(sessionId)) {
        activeSessions.get(sessionId).lastActivity = new Date();
      }
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request
      console.log('Creating new transport for initialization request');
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          console.log(`Session initialized: ${sessionId}`);
          // Store the transport by session ID
          transports[sessionId] = transport;
          activeSessions.set(sessionId, {
            createdAt: new Date(),
            lastActivity: new Date()
          });
        },
        onsessionclosed: (sessionId) => {
          console.log(`Session closed: ${sessionId}`);
          delete transports[sessionId];
          activeSessions.delete(sessionId);
        }
      });

      const mcpServer = new McpServer(folder)
      // Connect the MCP server to the new transport
      await mcpServer.server.connect(transport);
    } else {
      // Invalid request
      console.log('Invalid request: No valid session ID or not an initialize request');
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      });
      return;
    }
    
    // Handle the request through the MCP transport
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error('Request handling error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }
});

// Reusable handler for GET and DELETE requests
const handleSessionRequest = async (req, res) => {
  const sessionId = req.headers['mcp-session-id'];
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  // Update session activity
  if (activeSessions.has(sessionId)) {
    activeSessions.get(sessionId).lastActivity = new Date();
  }
  
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

// Handle GET requests for server-to-client notifications via SSE
app.get('/mcp', handleSessionRequest);

// Handle DELETE requests for session termination
app.delete('/mcp', handleSessionRequest);


// Periodic cleanup of stale sessions (optional)
setInterval(() => {
  const now = new Date();
  const staleThreshold = 30 * 60 * 1000; // 30 minutes
  
  for (const [sessionId, data] of activeSessions.entries()) {
    if (now - data.lastActivity > staleThreshold) {
      console.log(`Cleaning up stale session: ${sessionId}`);
      
      // Close the transport if it exists
      if (transports[sessionId]) {
        try {
          transports[sessionId].close();
        } catch (error) {
          console.error(`Error closing transport for session ${sessionId}:`, error);
        }
        delete transports[sessionId];
      }
      
      activeSessions.delete(sessionId);
    }
  }
}, 5 * 60 * 1000); // Check every 5 minutes


// Start the HTTP server
const server = app.listen(PORT, () => {
  console.log(`MCP HTTP server listening on port ${PORT}`);
  console.log('Session management enabled - each client gets its own transport instance');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  
  // Close all active transports
  for (const [sessionId, transport] of Object.entries(transports)) {
    try {
      console.log(`Closing transport for session: ${sessionId}`);
      transport.close();
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  
  // Close all active transports
  for (const [sessionId, transport] of Object.entries(transports)) {
    try {
      console.log(`Closing transport for session: ${sessionId}`);
      transport.close();
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }
  
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});