import NoteStorage from './storage.js';

class NotesService {
  constructor(notesFolder) {
    this.noteStorage = new NoteStorage();
    if (notesFolder) {
      this.noteStorage.setNotesFolder(notesFolder);
    }

    // Bind all handler methods to maintain 'this' context
    this.getAllNotesHandler = this.getAllNotesHandler.bind(this);
    this.getNoteHandler = this.getNoteHandler.bind(this);
    this.createNoteHandler = this.createNoteHandler.bind(this);
    this.updateNoteHandler = this.updateNoteHandler.bind(this);
    this.deleteNoteHandler = this.deleteNoteHandler.bind(this);
    this.setNotesFolderHandler = this.setNotesFolderHandler.bind(this);
    this.getNotesFolderHandler = this.getNotesFolderHandler.bind(this);
  }

  // Handler methods
  getAllNotesHandler(params) {
    try {
      const notes = this.noteStorage.getAllNotes();
      const notesList = Object.keys(notes).map(name => ({
        name,
        content: notes[name].content,
        created_at: notes[name].created_at,
        modified_at: notes[name].modified_at
      }));
      
      return {
        content: [{ 
          type: "text", 
          text: notesList.length > 0 
            ? JSON.stringify(notesList, null, 2)
            : "No notes found."
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }]
      };
    }
  }

  getNoteHandler({ name }) {
    try {
      const note = this.noteStorage.getNote(name);
      return {
        content: [{ 
          type: "text", 
          text: JSON.stringify(note, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }]
      };
    }
  }

  createNoteHandler({ name, content }) {
    try {
      console.log("Creating note with params:", { name, content }); 

      const note = this.noteStorage.addNote(name, content);
      return {
        content: [{ 
          type: "text", 
          text: `Note '${name}' created successfully.\n${JSON.stringify(note, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }]
      };
    }
  }

  updateNoteHandler({ name, content }) {
    try {
      const note = this.noteStorage.updateNote(name, content);
      return {
        content: [{ 
          type: "text", 
          text: `Note '${name}' updated successfully.\n${JSON.stringify(note, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }]
      };
    }
  }

  deleteNoteHandler({ name }) {
    try {
      const deletedNote = this.noteStorage.deleteNote(name);
      return {
        content: [{ 
          type: "text", 
          text: `Note '${name}' deleted successfully.\n${JSON.stringify(deletedNote, null, 2)}`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }]
      };
    }
  }

  setNotesFolderHandler({ folderPath }) {
    try {
      const result = this.noteStorage.setNotesFolder(folderPath);
      return {
        content: [{ 
          type: "text", 
          text: `${result.message}\nFound ${result.notesCount} existing notes in this location.`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }]
      };
    }
  }

  getNotesFolderHandler(params) {
    try {
      const folderPath = this.noteStorage.getNotesFolder();
      return {
        content: [{ 
          type: "text", 
          text: `Current notes folder: ${folderPath}`
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }]
      };
    }
  }
}

export default NotesService;
