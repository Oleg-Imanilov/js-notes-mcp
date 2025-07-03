// Test the stdio transport version to isolate HTTP transport issues
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testStdio() {
  console.log("Testing MCP stdio server...");
  
  let transport;
  let client;
  
  try {
    // Create transport - let it handle spawning the server process
    transport = new StdioClientTransport({
      command: "node",
      args: ["index-stdio.js"],
      cwd: process.cwd()
    });
    
    // Create client
    client = new Client({
      name: "test-stdio-client",
      version: "1.0.0"
    });
    
    console.log("Connecting to stdio server...");
    await client.connect(transport);
    console.log("✅ Connected successfully!");
    
    // List tools
    console.log("Listing tools...");
    const tools = await client.listTools();
    console.log("Available tools:", tools.tools.map(t => t.name).join(", "));
    
    // Cleanup
    await transport.close();
    console.log("✅ Test completed successfully!");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    return false;
  }
  
  return true;
}

testStdio()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
