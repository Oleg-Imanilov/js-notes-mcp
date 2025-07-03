// Simple test client to verify MCP HTTP server functionality
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const SERVER_URL = "http://localhost:3000/mcp";

async function testConnection() {
  console.log("Testing MCP HTTP server connection...");
  
  try {
    // Create transport
    const transport = new StreamableHTTPClientTransport(new URL(SERVER_URL));
    
    // Create client
    const client = new Client({
      name: "test-client",
      version: "1.0.0"
    });
    
    console.log("Connecting to server...");
    await client.connect(transport);
    console.log("✅ Connected successfully!");
    
    // Test basic functionality
    console.log("Testing server capabilities...");
    const capabilities = await client.getServerCapabilities();
    console.log("Server capabilities:", JSON.stringify(capabilities, null, 2));
    
    // List available tools
    console.log("Listing tools...");
    const tools = await client.listTools();
    console.log("Available tools:", tools.tools.map(t => t.name).join(", "));
    
    // Disconnect by closing the transport
    console.log("Disconnecting...");
    await transport.close();
    console.log("✅ Disconnected successfully!");
    
    // Test reconnection
    console.log("\n--- Testing Reconnection ---");
    const transport2 = new StreamableHTTPClientTransport(new URL(SERVER_URL));
    const client2 = new Client({
      name: "test-client-reconnect",
      version: "1.0.0"
    });
    
    console.log("Reconnecting...");
    await client2.connect(transport2);
    console.log("✅ Reconnected successfully!");
    
    await transport2.close();
    console.log("✅ Test completed successfully!");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack:", error.stack);
    return false;
  }
  
  return true;
}

// Run the test
testConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
