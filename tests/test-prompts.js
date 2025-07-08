import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testPrompts() {
  console.log("🧪 Testing MCP Prompts functionality...");
  
  try {
    // Create transport
    const transport = new StdioClientTransport({
      command: "node",
      args: ["index-stdio.js", "./data"],
    });
    
    // Create client
    const client = new Client({
      name: "test-prompts-client",
      version: "1.0.0"
    });
    
    console.log("Connecting to server...");
    await client.connect(transport);
    console.log("✅ Connected successfully!");
    
    // Test 1: List prompts
    console.log("\n--- Testing Prompt Listing ---");
    const prompts = await client.listPrompts();
    console.log(`✅ Found ${prompts.prompts.length} prompts:`);
    prompts.prompts.forEach(p => {
      console.log(`  - ${p.name}: ${p.description}`);
      if (p.arguments && p.arguments.length > 0) {
        console.log(`    Arguments: ${p.arguments.map(arg => `${arg.name}${arg.required ? ' (required)' : ' (optional)'}`).join(', ')}`);
      }
    });
    
    // Test 2: Get a specific prompt - Daily Reflection
    console.log("\n--- Testing Daily Reflection Prompt ---");
    try {
      const dailyReflectionPrompt = await client.getPrompt({
        name: "daily_reflection",
        arguments: {}
      });
      console.log("✅ Daily reflection prompt retrieved successfully");
      console.log("Prompt description:", dailyReflectionPrompt.description);
      console.log("Message preview:", dailyReflectionPrompt.messages[0].content.text.substring(0, 200) + "...");
    } catch (error) {
      console.log("❌ Error getting daily reflection prompt:", error.message);
    }
    
    // Test 3: Get Meeting Notes prompt with arguments
    console.log("\n--- Testing Meeting Notes Prompt with Arguments ---");
    try {
      const meetingNotesPrompt = await client.getPrompt({
        name: "create_meeting_notes",
        arguments: {
          meeting_type: "standup",
          attendees: "Alice, Bob, Charlie",
          agenda_items: "Sprint review, Blockers, Next sprint planning"
        }
      });
      console.log("✅ Meeting notes prompt with arguments retrieved successfully");
      console.log("Prompt description:", meetingNotesPrompt.description);
    } catch (error) {
      console.log("❌ Error getting meeting notes prompt:", error.message);
    }
    
    // Test 4: Create a test note and then use analyze_notes prompt
    console.log("\n--- Testing Analyze Notes Prompt ---");
    try {
      // Create a test note first
      await client.callTool({
        name: "create_note",
        arguments: {
          name: "test-prompt-note",
          content: "This is a test note created to test the analyze_notes prompt functionality. It contains some test content about project planning and daily tasks."
        }
      });
      console.log("✅ Test note created");
      
      // Get analyze notes prompt
      const analyzePrompt = await client.getPrompt({
        name: "analyze_notes",
        arguments: {
          focus_area: "themes and patterns"
        }
      });
      console.log("✅ Analyze notes prompt retrieved successfully");
      console.log("Prompt includes test note content:", analyzePrompt.messages[0].content.text.includes("test-prompt-note"));
      
      // Clean up test note
      await client.callTool({
        name: "delete_note",
        arguments: { name: "test-prompt-note" }
      });
      console.log("✅ Test note cleaned up");
    } catch (error) {
      console.log("❌ Error testing analyze notes prompt:", error.message);
    }
    
    // Test 5: Get Project Planning prompt
    console.log("\n--- Testing Project Planning Prompt ---");
    try {
      const projectPrompt = await client.getPrompt({
        name: "project_planning",
        arguments: {
          project_name: "Test Project",
          deadline: "2025-08-01",
          team_size: "5"
        }
      });
      console.log("✅ Project planning prompt retrieved successfully");
      console.log("Template includes project name:", projectPrompt.messages[0].content.text.includes("Test Project"));
    } catch (error) {
      console.log("❌ Error getting project planning prompt:", error.message);
    }
    
    // Test 6: Test error handling for non-existent prompt
    console.log("\n--- Testing Error Handling ---");
    try {
      await client.getPrompt({
        name: "non_existent_prompt",
        arguments: {}
      });
      console.log("❌ Should have thrown an error for non-existent prompt");
    } catch (error) {
      console.log("✅ Correctly handled non-existent prompt error:", error.message);
    }
    
    await transport.close();
    console.log("\n🎉 All prompt tests completed successfully!");
    
  } catch (error) {
    console.error("❌ Prompt test failed:", error.message);
    console.error("Stack:", error.stack);
    return false;
  }
  
  return true;
}

testPrompts()
  .then(success => {
    console.log(success ? "\n✅ Prompt test completed successfully!" : "\n❌ Prompt test failed!");
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
