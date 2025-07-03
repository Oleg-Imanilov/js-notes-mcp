import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { unlinkSync, existsSync, mkdirSync, rmSync } from "fs";

// Test configuration
const TEST_NOTES_FOLDER = "./tests/temp-notes1";
const TEMP_NOTES_FOLDER = "./tests/temp-notes2";

// Clean up function
function cleanup() {
    try {
        if (existsSync(TEST_NOTES_FOLDER)) {
            rmSync(TEST_NOTES_FOLDER, { recursive: true, force: true });
        }
        if (existsSync(TEMP_NOTES_FOLDER)) {
            rmSync(TEMP_NOTES_FOLDER, { recursive: true, force: true });
        }
    } catch (error) {
        console.log("Cleanup warning:", error.message);
    }
}

// Test runner function
async function runTest(testName, testFunc) {
    console.log(`\n🧪 Running test: ${testName}`);
    try {
        await testFunc();
        console.log(`✅ ${testName} - PASSED`);
        return true;
    } catch (error) {
        console.log(`❌ ${testName} - FAILED: ${error.message}`);
        return false;
    }
}

// Assertion helper
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

async function main() {
    console.log("🚀 Starting comprehensive MCP Notes Server tests");
    
    // Clean up before starting
    cleanup();
    
    // Create temp directories
    if (!existsSync(TEST_NOTES_FOLDER)) {
        mkdirSync(TEST_NOTES_FOLDER, { recursive: true });
    }

    if (!existsSync(TEMP_NOTES_FOLDER)) {
        mkdirSync(TEMP_NOTES_FOLDER, { recursive: true });
    }

    // Setup client connection
    const transport = new StdioClientTransport({
        command: "node",
        args: ["index-stdio.js", TEST_NOTES_FOLDER],
    });

    const client = new Client({
        name: "test-client",
        version: "1.0.0"
    });

    try {
        await client.connect(transport);
        console.log("✅ Connected to MCP server");
    } catch (error) {
        console.error("❌ Error connecting to MCP server:", error);
        process.exit(1);
    }

    let passedTests = 0;
    let totalTests = 0;

    // Test 1: Get notes folder (initial state)
    totalTests++;
    if (await runTest("Get initial notes folder", async () => {
        const result = await client.callTool({
            name: "get_notes_folder",
            arguments: {}
        });
        const response = result.content[0].text;
        assert(response.includes('temp-notes1'), "Should return correct initial folder");
    })) passedTests++;

    // Test 2: Get all notes (empty state)
    totalTests++;
    if (await runTest("Get all notes (empty)", async () => {
        const result = await client.callTool({
            name: "get_all_notes",
            arguments: {}
        });
        const response = result.content[0].text;
        assert(response === "No notes found.", "Should return no notes message");
    })) passedTests++;

    // Test 3: Create first note
    totalTests++;
    if (await runTest("Create first note", async () => {
        const result = await client.callTool({
            name: "create_note",
            arguments: {
                name: "first-note",
                content: "This is the first test note"
            }
        });
        const response = result.content[0].text;
        assert(response.includes("created successfully"), "Should confirm note creation");
        assert(response.includes("first-note"), "Should include note name");
    })) passedTests++;

    // Test 4: Get specific note
    totalTests++;
    if (await runTest("Get specific note", async () => {
        const result = await client.callTool({
            name: "get_note",
            arguments: {
                name: "first-note"
            }
        });
        const response = result.content[0].text;
        const noteData = JSON.parse(response);
        assert(noteData.name === "first-note", "Should return correct note name");
        assert(noteData.content === "This is the first test note", "Should return correct content");
        assert(noteData.created_at, "Should have created_at timestamp");
        assert(noteData.modified_at, "Should have modified_at timestamp");
    })) passedTests++;

    // Test 5: Create second note
    totalTests++;
    if (await runTest("Create second note", async () => {
        const result = await client.callTool({
            name: "create_note",
            arguments: {
                name: "second-note",
                content: "This is the second test note"
            }
        });
        const response = result.content[0].text;
        assert(response.includes("created successfully"), "Should confirm note creation");
    })) passedTests++;

    // Test 6: Get all notes (with data)
    totalTests++;
    if (await runTest("Get all notes (with data)", async () => {
        const result = await client.callTool({
            name: "get_all_notes",
            arguments: {}
        });
        const response = result.content[0].text;
        const notes = JSON.parse(response);
        assert(Array.isArray(notes), "Should return array of notes");
        assert(notes.length === 2, "Should return exactly 2 notes");
        assert(notes.some(note => note.name === "first-note"), "Should include first note");
        assert(notes.some(note => note.name === "second-note"), "Should include second note");
    })) passedTests++;

    // Test 7: Update note
    totalTests++;
    if (await runTest("Update note", async () => {
        const result = await client.callTool({
            name: "update_note",
            arguments: {
                name: "first-note",
                content: "This is the updated content for the first note"
            }
        });
        const response = result.content[0].text;
        assert(response.includes("updated successfully"), "Should confirm note update");
        
        // Verify the update
        const getResult = await client.callTool({
            name: "get_note",
            arguments: { name: "first-note" }
        });
        const noteData = JSON.parse(getResult.content[0].text);
        assert(noteData.content === "This is the updated content for the first note", "Content should be updated");
    })) passedTests++;

    // Test 8: Set notes folder
    totalTests++;
    if (await runTest("Set notes folder", async () => {
        const result = await client.callTool({
            name: "set_notes_folder",
            arguments: {
                folderPath: TEMP_NOTES_FOLDER
            }
        });
        const response = result.content[0].text;
        assert(response.includes("Notes folder set to"), "Should confirm folder change");
        assert(response.includes("Found 0 existing notes"), "Should report no existing notes in new folder");
    })) passedTests++;

    // Test 9: Verify folder change
    totalTests++;
    if (await runTest("Verify folder change", async () => {
        const result = await client.callTool({
            name: "get_notes_folder",
            arguments: {}
        });
        const response = result.content[0].text;
        assert(response.includes('temp-notes2'), "Should return new folder path");
        
        // Should have no notes in new folder
        const notesResult = await client.callTool({
            name: "get_all_notes",
            arguments: {}
        });
        assert(notesResult.content[0].text === "No notes found.", "Should have no notes in new folder");
    })) passedTests++;

    // Test 10: Switch back to original folder
    totalTests++;
    if (await runTest("Switch back to original folder", async () => {
        const result = await client.callTool({
            name: "set_notes_folder",
            arguments: {
                folderPath: TEST_NOTES_FOLDER
            }
        });
        const response = result.content[0].text;
        assert(response.includes("Found 2 existing notes"), "Should find the original notes");
    })) passedTests++;

    // Test 11: Delete note
    totalTests++;
    if (await runTest("Delete note", async () => {
        const result = await client.callTool({
            name: "delete_note",
            arguments: {
                name: "second-note"
            }
        });
        const response = result.content[0].text;
        assert(response.includes("deleted successfully"), "Should confirm deletion");
        
        // Verify deletion
        const notesResult = await client.callTool({
            name: "get_all_notes",
            arguments: {}
        });
        const notes = JSON.parse(notesResult.content[0].text);
        assert(notes.length === 1, "Should have only 1 note remaining");
        assert(notes[0].name === "first-note", "Should keep the first note");
    })) passedTests++;

    // Test 12: Error handling - Get non-existent note
    totalTests++;
    if (await runTest("Error handling - Get non-existent note", async () => {
        const result = await client.callTool({
            name: "get_note",
            arguments: {
                name: "non-existent-note"
            }
        });
        const response = result.content[0].text;
        assert(response.includes("Error:"), "Should return error message");
        assert(response.includes("not found"), "Should indicate note not found");
    })) passedTests++;

    // Test 13: Error handling - Update non-existent note
    totalTests++;
    if (await runTest("Error handling - Update non-existent note", async () => {
        const result = await client.callTool({
            name: "update_note",
            arguments: {
                name: "non-existent-note",
                content: "This won't work"
            }
        });
        const response = result.content[0].text;
        assert(response.includes("Error:"), "Should return error message");
        assert(response.includes("not found"), "Should indicate note not found");
    })) passedTests++;

    // Test 14: Error handling - Delete non-existent note
    totalTests++;
    if (await runTest("Error handling - Delete non-existent note", async () => {
        const result = await client.callTool({
            name: "delete_note",
            arguments: {
                name: "non-existent-note"
            }
        });
        const response = result.content[0].text;
        assert(response.includes("Error:"), "Should return error message");
        assert(response.includes("not found"), "Should indicate note not found");
    })) passedTests++;

    // Test 15: Attempt to create duplicate note
    totalTests++;
    if (await runTest("Error handling - Create duplicate note", async () => {
        const result = await client.callTool({
            name: "create_note",
            arguments: {
                name: "first-note",
                content: "This should fail"
            }
        });
        const response = result.content[0].text;
        assert(response.includes("Error:"), "Should return error for duplicate");
    })) passedTests++;

    await client.close();
    console.log("\n📊 Test Results Summary:");
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
        console.log("🎉 All tests passed!");
    } else {
        console.log("⚠️  Some tests failed!");
        process.exit(1);
    }
    
    // Clean up after tests
    cleanup();
    console.log("🧹 Cleanup completed");
}

main().catch(console.error);
