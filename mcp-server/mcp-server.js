import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListResourcesRequestSchema, ReadResourceRequestSchema, ListToolsRequestSchema, CallToolRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import NotesService from './notes-service.js';

class NotesMcpServer {

  constructor(notesFolder) {
    this.notesService = new NotesService(notesFolder);

    // Create an MCP server
    this.server = new Server({
      name: "Notes-server",
      version: "1.0.0"
    }, {
      capabilities: {
        resources: {
          subscribe: true,        // Enable resource subscription for real-time updates
          listChanged: true       // Enable notifications when resource list changes
        },
        tools: {
          // listChanged: true    // Enable notifications when tool list changes
        },
        prompts: {
          listChanged: true       // Enable notifications when prompt list changes
        },
        logging: {},              // Enable logging capability for debugging
        completions: {},          // Enable argument completion for tools/prompts
        // sampling: {},          // Uncomment to enable LLM sampling capability
        // elicitation: {},       // Uncomment to enable elicitation (structured data requests)
        // roots: {}              // Uncomment if your server supports MCP roots protocol
      }
    });

    this.setupTools();
    this.setupResources();
    this.setupPrompts()
  }  setupPrompts() {
    // Handle prompt listing
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: "analyze_notes",
            description: "Analyze all notes to identify patterns, themes, or insights",
            arguments: [
              {
                name: "focus_area",
                description: "Specific area to focus analysis on (e.g., 'trends', 'themes', 'summary')",
                required: false
              }
            ]
          },
          {
            name: "create_meeting_notes",
            description: "Template for creating structured meeting notes",
            arguments: [
              {
                name: "meeting_type",
                description: "Type of meeting (e.g., 'standup', 'planning', 'review')",
                required: true
              },
              {
                name: "attendees",
                description: "List of meeting attendees",
                required: false
              },
              {
                name: "agenda_items",
                description: "Main agenda items to cover",
                required: false
              }
            ]
          },
          {
            name: "summarize_note",
            description: "Create a summary of a specific note or group of notes",
            arguments: [
              {
                name: "note_name",
                description: "Name of the note to summarize (leave empty to summarize all notes)",
                required: false
              },
              {
                name: "summary_length",
                description: "Desired length of summary ('short', 'medium', 'long')",
                required: false
              }
            ]
          },
          {
            name: "daily_reflection",
            description: "Template for daily reflection notes",
            arguments: [
              {
                name: "date",
                description: "Date for the reflection (defaults to today)",
                required: false
              }
            ]
          },
          {
            name: "project_planning",
            description: "Template for project planning and task breakdown",
            arguments: [
              {
                name: "project_name",
                description: "Name of the project",
                required: true
              },
              {
                name: "deadline",
                description: "Project deadline",
                required: false
              },
              {
                name: "team_size",
                description: "Number of team members",
                required: false
              }
            ]
          }
        ]
      };
    });

    // Handle prompt execution
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "analyze_notes":
          return this.getAnalyzeNotesPrompt(args);
        
        case "create_meeting_notes":
          return this.getMeetingNotesPrompt(args);
        
        case "summarize_note":
          return this.getSummarizeNotePrompt(args);
        
        case "daily_reflection":
          return this.getDailyReflectionPrompt(args);
        
        case "project_planning":
          return this.getProjectPlanningPrompt(args);
        
        default:
          throw new Error(`Prompt not found: ${name}`);
      }
    });
  }

  // Prompt implementation methods
  getAnalyzeNotesPrompt(args) {
    const notes = this.notesService.noteStorage.getAllNotes();
    const notesList = Object.keys(notes).map(name => ({
      name,
      content: notes[name].content,
      created_at: notes[name].created_at,
      modified_at: notes[name].modified_at
    }));

    const focusArea = args?.focus_area || "general patterns and insights";
    
    let prompt = `Please analyze the following notes and identify ${focusArea}:\n\n`;
    
    if (notesList.length === 0) {
      prompt += "No notes are currently available for analysis.";
    } else {
      notesList.forEach((note, index) => {
        prompt += `## Note ${index + 1}: ${note.name}\n`;
        prompt += `Created: ${note.created_at}\n`;
        prompt += `Last Modified: ${note.modified_at}\n`;
        prompt += `Content:\n${note.content}\n\n`;
      });
      
      prompt += `\nPlease provide insights about:\n`;
      prompt += `- Common themes or patterns\n`;
      prompt += `- Key topics or subjects\n`;
      prompt += `- Progression of ideas over time\n`;
      prompt += `- Recommendations for organization or next steps\n`;
    }

    return {
      description: `Analysis of all notes focusing on ${focusArea}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: prompt
          }
        }
      ]
    };
  }

  getMeetingNotesPrompt(args) {
    const meetingType = args?.meeting_type || "general";
    const attendees = args?.attendees || "";
    const agendaItems = args?.agenda_items || "";
    
    const date = new Date().toISOString().split('T')[0];
    
    let prompt = `# ${meetingType.charAt(0).toUpperCase() + meetingType.slice(1)} Meeting Notes\n\n`;
    prompt += `**Date:** ${date}\n`;
    prompt += `**Meeting Type:** ${meetingType}\n`;
    
    if (attendees) {
      prompt += `**Attendees:** ${attendees}\n`;
    } else {
      prompt += `**Attendees:** [Add attendees here]\n`;
    }
    
    prompt += `\n## Agenda\n`;
    if (agendaItems) {
      const items = agendaItems.split(',').map(item => item.trim());
      items.forEach((item, index) => {
        prompt += `${index + 1}. ${item}\n`;
      });
    } else {
      prompt += `1. [Add agenda item]\n2. [Add agenda item]\n3. [Add agenda item]\n`;
    }
    
    prompt += `\n## Discussion Points\n\n`;
    prompt += `### [Topic 1]\n- [Key discussion points]\n- [Decisions made]\n- [Action items]\n\n`;
    prompt += `### [Topic 2]\n- [Key discussion points]\n- [Decisions made]\n- [Action items]\n\n`;
    
    prompt += `## Action Items\n\n`;
    prompt += `| Task | Assignee | Due Date | Status |\n`;
    prompt += `|------|----------|----------|--------|\n`;
    prompt += `| [Task description] | [Name] | [Date] | [ ] |\n`;
    prompt += `| [Task description] | [Name] | [Date] | [ ] |\n`;
    
    prompt += `\n## Next Meeting\n\n`;
    prompt += `**Date:** [Next meeting date]\n`;
    prompt += `**Focus:** [Main focus for next meeting]\n`;

    return {
      description: `Template for ${meetingType} meeting notes`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please create a meeting note using this template. You can modify and customize it as needed:\n\n${prompt}`
          }
        }
      ]
    };
  }

  getSummarizeNotePrompt(args) {
    const noteName = args?.note_name;
    const summaryLength = args?.summary_length || "medium";
    
    let prompt = "";
    let description = "";

    if (noteName) {
      try {
        const note = this.notesService.noteStorage.getNote(noteName);
        description = `Summary of note: ${noteName}`;
        prompt = `Please create a ${summaryLength} summary of the following note:\n\n`;
        prompt += `**Note Name:** ${note.name}\n`;
        prompt += `**Created:** ${note.created_at}\n`;
        prompt += `**Last Modified:** ${note.modified_at}\n\n`;
        prompt += `**Content:**\n${note.content}\n\n`;
      } catch (error) {
        prompt = `Error: Note "${noteName}" not found. Please check the note name and try again.`;
        description = `Error retrieving note: ${noteName}`;
      }
    } else {
      // Summarize all notes
      const notes = this.notesService.noteStorage.getAllNotes();
      const notesList = Object.keys(notes).map(name => ({
        name,
        content: notes[name].content,
        created_at: notes[name].created_at,
        modified_at: notes[name].modified_at
      }));

      description = "Summary of all notes";
      
      if (notesList.length === 0) {
        prompt = "No notes are currently available to summarize.";
      } else {
        prompt = `Please create a ${summaryLength} summary of all the following notes:\n\n`;
        notesList.forEach((note, index) => {
          prompt += `## ${index + 1}. ${note.name}\n`;
          prompt += `${note.content}\n\n`;
        });
      }
    }

    const lengthInstructions = {
      short: "Keep the summary concise and focus on key points only.",
      medium: "Provide a balanced summary with main ideas and important details.",
      long: "Create a comprehensive summary including context and nuances."
    };

    prompt += `\n**Summary Instructions:** ${lengthInstructions[summaryLength] || lengthInstructions.medium}`;

    return {
      description,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: prompt
          }
        }
      ]
    };
  }

  getDailyReflectionPrompt(args) {
    const date = args?.date || new Date().toISOString().split('T')[0];
    
    const prompt = `# Daily Reflection - ${date}\n\n` +
      `## What went well today?\n` +
      `[Reflect on positive experiences, achievements, and moments of success]\n\n` +
      `## What could have been better?\n` +
      `[Consider challenges faced and areas for improvement]\n\n` +
      `## What did I learn?\n` +
      `[Document new insights, knowledge, or skills gained]\n\n` +
      `## Key moments/events\n` +
      `[Record significant events or interactions from the day]\n\n` +
      `## Mood and energy level\n` +
      `[Rate 1-10 and describe how you felt throughout the day]\n\n` +
      `## Tomorrow's priorities\n` +
      `1. [Priority 1]\n` +
      `2. [Priority 2]\n` +
      `3. [Priority 3]\n\n` +
      `## Gratitude\n` +
      `[Three things you're grateful for today]\n` +
      `1. \n2. \n3. \n\n` +
      `## Notes for future self\n` +
      `[Any advice, reminders, or insights for your future self]`;

    return {
      description: `Daily reflection template for ${date}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please help me create a daily reflection note using this template. You can ask me questions to fill out each section:\n\n${prompt}`
          }
        }
      ]
    };
  }

  getProjectPlanningPrompt(args) {
    const projectName = args?.project_name || "[Project Name]";
    const deadline = args?.deadline || "[Project Deadline]";
    const teamSize = args?.team_size || "[Team Size]";
    
    const prompt = `# Project Planning: ${projectName}\n\n` +
      `## Project Overview\n` +
      `**Project Name:** ${projectName}\n` +
      `**Deadline:** ${deadline}\n` +
      `**Team Size:** ${teamSize}\n` +
      `**Project Manager:** [Name]\n` +
      `**Start Date:** ${new Date().toISOString().split('T')[0]}\n\n` +
      `## Project Objectives\n` +
      `### Primary Goal\n` +
      `[Describe the main objective of this project]\n\n` +
      `### Success Criteria\n` +
      `- [ ] [Measurable outcome 1]\n` +
      `- [ ] [Measurable outcome 2]\n` +
      `- [ ] [Measurable outcome 3]\n\n` +
      `## Scope and Requirements\n` +
      `### In Scope\n` +
      `- [What will be included]\n` +
      `- [Feature or deliverable]\n` +
      `- [Another requirement]\n\n` +
      `### Out of Scope\n` +
      `- [What will NOT be included]\n` +
      `- [Excluded feature]\n\n` +
      `## Timeline and Milestones\n` +
      `| Milestone | Due Date | Status | Owner |\n` +
      `|-----------|----------|--------|---------|\n` +
      `| Project Kickoff | [Date] | [ ] | [Name] |\n` +
      `| Requirements Gathering | [Date] | [ ] | [Name] |\n` +
      `| Design Phase | [Date] | [ ] | [Name] |\n` +
      `| Development Phase | [Date] | [ ] | [Name] |\n` +
      `| Testing Phase | [Date] | [ ] | [Name] |\n` +
      `| Project Delivery | ${deadline} | [ ] | [Name] |\n\n` +
      `## Task Breakdown\n` +
      `### Phase 1: Planning\n` +
      `- [ ] [Task 1]\n` +
      `- [ ] [Task 2]\n` +
      `- [ ] [Task 3]\n\n` +
      `### Phase 2: Execution\n` +
      `- [ ] [Task 1]\n` +
      `- [ ] [Task 2]\n` +
      `- [ ] [Task 3]\n\n` +
      `### Phase 3: Completion\n` +
      `- [ ] [Task 1]\n` +
      `- [ ] [Task 2]\n` +
      `- [ ] [Task 3]\n\n` +
      `## Resources and Dependencies\n` +
      `### Team Members\n` +
      `- [Name] - [Role]\n` +
      `- [Name] - [Role]\n\n` +
      `### External Dependencies\n` +
      `- [Dependency description]\n` +
      `- [Another dependency]\n\n` +
      `## Risk Assessment\n` +
      `| Risk | Impact | Probability | Mitigation |\n` +
      `|------|--------|-------------|------------|\n` +
      `| [Risk description] | High/Med/Low | High/Med/Low | [How to mitigate] |\n\n` +
      `## Communication Plan\n` +
      `- **Daily Standups:** [Time/Frequency]\n` +
      `- **Weekly Reviews:** [Day/Time]\n` +
      `- **Status Reports:** [Frequency]\n` +
      `- **Stakeholder Updates:** [Frequency]\n\n` +
      `## Notes\n` +
      `[Additional notes, considerations, or important information]`;

    return {
      description: `Project planning template for ${projectName}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please help me create a comprehensive project plan using this template. Feel free to ask questions to customize it for your specific project:\n\n${prompt}`
          }
        }
      ]
    };
  }

  setupResources() {
    // Handle resource listing
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: "notes://all",
            name: "All Notes",
            description: "Collection of all stored notes",
            mimeType: "application/json"
          },
          {
            uri: "notes://list",
            name: "Notes List",
            description: "List of all note names and metadata",
            mimeType: "application/json"
          }
        ]
      };
    });

    // Handle resource reading
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;

      if (uri === "notes://all") {
        const result = this.notesService.getAllNotesHandler({});
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: result.content[0].text
            }
          ]
        };
      } else if (uri === "notes://list") {
        const notes = this.notesService.noteStorage.getAllNotes();
        const notesList = Object.keys(notes).map(name => ({
          name,
          created_at: notes[name].created_at,
          modified_at: notes[name].modified_at
        }));
        
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(notesList, null, 2)
            }
          ]
        };
      } else {
        throw new Error(`Resource not found: ${uri}`);
      }
    });
  }

  setupTools() {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "get_all_notes",
            description: "Retrieve all stored notes",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false
            }
          },
          {
            name: "get_note",
            description: "Get the content of a specific note by name",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string", minLength: 1 }
              },
              required: ["name"],
              additionalProperties: false
            }
          },
          {
            name: "create_note",
            description: "Create a new note with name and content",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string", minLength: 1 },
                content: { type: "string", minLength: 1 }
              },
              required: ["name", "content"],
              additionalProperties: false
            }
          },
          {
            name: "update_note",
            description: "Update the content of an existing note",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string", minLength: 1 },
                content: { type: "string", minLength: 1 }
              },
              required: ["name", "content"],
              additionalProperties: false
            }
          },
          {
            name: "delete_note",
            description: "Delete an existing note",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string", minLength: 1 }
              },
              required: ["name"],
              additionalProperties: false
            }
          },
          {
            name: "set_notes_folder",
            description: "Set the folder where notes will be stored and loaded from",
            inputSchema: {
              type: "object",
              properties: {
                folderPath: { type: "string", minLength: 1 }
              },
              required: ["folderPath"],
              additionalProperties: false
            }
          },
          {
            name: "get_notes_folder",
            description: "Get the current folder path where notes are being stored",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false
            }
          }
        ]
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "get_all_notes":
          return this.notesService.getAllNotesHandler(args || {});
        
        case "get_note":
          return this.notesService.getNoteHandler(args);
        
        case "create_note":
          return this.notesService.createNoteHandler(args);
        
        case "update_note":
          return this.notesService.updateNoteHandler(args);
        
        case "delete_note":
          return this.notesService.deleteNoteHandler(args);
        
        case "set_notes_folder":
          return this.notesService.setNotesFolderHandler(args);
        
        case "get_notes_folder":
          return this.notesService.getNotesFolderHandler(args || {});
        
        default:
          throw new Error(`Tool not found: ${name}`);
      }
    });
  }
}

export default NotesMcpServer;
