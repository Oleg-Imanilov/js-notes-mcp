import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import NotesService from './notes-service.js';

class NotesMcpServer {

  constructor(notesFolder) {
    this.notesService = new NotesService(notesFolder);

    // Create an MCP server
    this.server = new McpServer({
      name: "Notes-server",
      version: "1.0.0"
    });

    this.setupTools();
  }

  setupTools() {
    // Note management tools
    this.server.registerTool("get_all_notes",
      {
        title: "Get All Notes",
        description: "Retrieve all stored notes"
      },
      this.notesService.getAllNotesHandler
    );

    this.server.registerTool("get_note",
      {
        title: "Get Note",
        description: "Get the content of a specific note by name",
        inputSchema: {
          name: z.string().min(1, "Note name cannot be empty")
        }
      },
      this.notesService.getNoteHandler
    );

    this.server.registerTool("create_note",
      {
        title: "Create Note",
        description: "Create a new note with name and content",
        inputSchema: {
          name: z.string().min(1, "Note name cannot be empty"),
          content: z.string().min(1, "Note content cannot be empty"),
        }
      },
      this.notesService.createNoteHandler
    );

    this.server.registerTool("update_note",
      {
        title: "Update Note",
        description: "Update the content of an existing note",
        inputSchema: {
          name: z.string().min(1, "Note name cannot be empty"),
          content: z.string().min(1, "Note content cannot be empty")
        }
      },
      this.notesService.updateNoteHandler
    );

    this.server.registerTool("delete_note",
      {
        title: "Delete Note",
        description: "Delete an existing note",
        inputSchema: {
          name: z.string().min(1, "Note name cannot be empty")
        }
      },
      this.notesService.deleteNoteHandler
    );

    this.server.registerTool("set_notes_folder",
      {
        title: "Set Notes Folder",
        description: "Set the folder where notes will be stored and loaded from",
        inputSchema: {
          folderPath: z.string().min(1, "Folder path cannot be empty")
        }
      },
      this.notesService.setNotesFolderHandler
    );

    this.server.registerTool("get_notes_folder",
      {
        title: "Get Notes Folder",
        description: "Get the current folder path where notes are being stored"
      },
      this.notesService.getNotesFolderHandler
    );
  }
}

export default NotesMcpServer;
