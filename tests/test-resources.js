import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { existsSync, mkdirSync, rmSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_NOTES_FOLDER = "./tests/test-notes";

// Clean up function
function cleanup() {
    try {
        if (existsSync(TEST_NOTES_FOLDER)) {
            rmSync(TEST_NOTES_FOLDER, { recursive: true, force: true });
        }
    } catch (error) {
        console.log("Cleanup warning:", error.message);
    }
}

async function testResources() {
  console.log("🧪 Testing MCP Server Resources...\n");

  // Setup test directory
  cleanup();
  if (!existsSync(TEST_NOTES_FOLDER)) {
    mkdirSync(TEST_NOTES_FOLDER, { recursive: true });
  }

  // Create client transport - this will handle spawning the server
  const transport = new StdioClientTransport({
    command: "node",
    args: ["index-stdio.js", TEST_NOTES_FOLDER]
  });

  const client = new Client({
    name: "test-client",
    version: "1.0.0"
  }, {
    capabilities: {
      resources: {}
    }
  });

  try {
    // Connect to server
    await client.connect(transport);
    console.log("✅ Connected to MCP server");

    // Test 1: List available resources
    console.log("\n📋 Test 1: List Resources");
    try {
      const resourcesResponse = await client.listResources();
      
      console.log("✅ Resources list retrieved successfully:");
      resourcesResponse.resources.forEach(resource => {
        console.log(`   - ${resource.name}: ${resource.uri}`);
        console.log(`     Description: ${resource.description}`);
        console.log(`     MIME Type: ${resource.mimeType}`);
      });
    } catch (error) {
      console.log("❌ Failed to list resources:", error.message);
    }

    // First, create some test notes for the resources to read
    console.log("\n📝 Setting up test notes...");
    try {
      await client.callTool({
        name: "create_note",
        arguments: {
          name: "test-note-1",
          content: "This is the first test note for resources testing."
        }
      });

      await client.callTool({
        name: "create_note",
        arguments: {
          name: "test-note-2",
          content: "This is the second test note with different content."
        }
      });
      console.log("✅ Test notes created");
    } catch (error) {
      console.log("⚠️  Warning: Could not create test notes:", error.message);
    }

    // Test 2: Read "notes://all" resource
    console.log("\n📖 Test 2: Read All Notes Resource");
    try {
      const allNotesResponse = await client.readResource({
        uri: "notes://all"
      });
      
      console.log("✅ All notes resource read successfully:");
      allNotesResponse.contents.forEach((content, index) => {
        console.log(`   Content ${index + 1}:`);
        console.log(`   URI: ${content.uri}`);
        console.log(`   MIME Type: ${content.mimeType}`);
        
        // Parse and display the notes data
        try {
          const notesData = JSON.parse(content.text);
          console.log(`   Notes count: ${Object.keys(notesData).length}`);
          Object.keys(notesData).forEach(noteName => {
            console.log(`     - ${noteName}`);
          });
        } catch (parseError) {
          console.log(`   Content preview: ${content.text.substring(0, 100)}...`);
        }
      });
    } catch (error) {
      console.log("❌ Failed to read all notes resource:", error.message);
    }

    // Test 3: Read "notes://list" resource
    console.log("\n📋 Test 3: Read Notes List Resource");
    try {
      const notesListResponse = await client.readResource({
        uri: "notes://list"
      });
      
      console.log("✅ Notes list resource read successfully:");
      notesListResponse.contents.forEach((content, index) => {
        console.log(`   Content ${index + 1}:`);
        console.log(`   URI: ${content.uri}`);
        console.log(`   MIME Type: ${content.mimeType}`);
        
        // Parse and display the notes list
        try {
          const notesList = JSON.parse(content.text);
          console.log(`   Notes in list: ${notesList.length}`);
          notesList.forEach(note => {
            console.log(`     - ${note.name} (created: ${note.created_at})`);
          });
        } catch (parseError) {
          console.log(`   Content preview: ${content.text.substring(0, 100)}...`);
        }
      });
    } catch (error) {
      console.log("❌ Failed to read notes list resource:", error.message);
    }

    // Test 4: Try to read non-existent resource
    console.log("\n🚫 Test 4: Read Non-existent Resource");
    try {
      await client.readResource({
        uri: "notes://invalid"
      });
      console.log("❌ Should have failed for invalid resource");
    } catch (error) {
      console.log("✅ Correctly rejected invalid resource:", error.message);
    }

    // Test 5: Verify resource data consistency
    console.log("\n🔍 Test 5: Verify Resource Data Consistency");
    try {
      // Get all notes via resource
      const allNotesResource = await client.readResource({
        uri: "notes://all"
      });

      // Get notes list via resource
      const notesListResource = await client.readResource({
        uri: "notes://list"
      });

      // Get all notes via tool for comparison
      const allNotesTool = await client.callTool({
        name: "get_all_notes", 
        arguments: {}
      });

      // Parse the data
      const resourceAllNotes = JSON.parse(allNotesResource.contents[0].text);
      const resourceNotesList = JSON.parse(notesListResource.contents[0].text);
      const toolAllNotes = JSON.parse(allNotesTool.content[0].text);

      // Compare counts
      const resourceCount = Object.keys(resourceAllNotes).length;
      const listCount = resourceNotesList.length;
      const toolCount = Object.keys(toolAllNotes).length;

      if (resourceCount === listCount && listCount === toolCount) {
        console.log(`✅ Data consistency verified: ${resourceCount} notes across all sources`);
      } else {
        console.log(`❌ Data inconsistency detected:`);
        console.log(`   Resource all notes: ${resourceCount}`);
        console.log(`   Resource notes list: ${listCount}`);
        console.log(`   Tool all notes: ${toolCount}`);
      }

      // Verify note names match
      const resourceNames = Object.keys(resourceAllNotes).sort();
      const listNames = resourceNotesList.map(n => n.name).sort();
      const toolNames = Object.keys(toolAllNotes).sort();

      const namesMatch = JSON.stringify(resourceNames) === JSON.stringify(listNames) && 
                        JSON.stringify(listNames) === JSON.stringify(toolNames);

      if (namesMatch) {
        console.log("✅ Note names consistent across all sources");
      } else {
        console.log("❌ Note names inconsistent between sources");
      }

    } catch (error) {
      console.log("❌ Failed to verify data consistency:", error.message);
    }

    console.log("\n🎉 Resource testing completed!");

  } catch (error) {
    console.error("❌ Connection failed:", error);
  } finally {
    // Clean up
    try {
      await client.close();
      cleanup();
    } catch (cleanupError) {
      console.error("Warning: Cleanup failed:", cleanupError);
    }
  }
}

// Run the tests
testResources().catch(console.error);