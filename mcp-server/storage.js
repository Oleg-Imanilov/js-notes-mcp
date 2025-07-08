import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || "./data/";

class NoteStorage {
    /**
     * Storage system for managing persistent notes.
     */
    constructor(notesFolder = DATA_DIR) {
        // Ensure we always store absolute path
        this.notesFolder = path.resolve(notesFolder);
        this.notesFile = path.join(this.notesFolder, 'notes_storage.json');
        this.notes = this.loadNotes();
    }

    /**
     * Load notes from storage file.
     * @returns {Object} Notes object
     */
    loadNotes() {
        try {
            if (fs.existsSync(this.notesFile)) {
                const data = fs.readFileSync(this.notesFile, 'utf8');
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading notes:', error);
        }
        return {};
    }

    /**
     * Save current notes to storage file.
     */
    saveNotes() {
        try {
            // Ensure the directory exists
            if (!fs.existsSync(this.notesFolder)) {
                fs.mkdirSync(this.notesFolder, { recursive: true });
            }
            fs.writeFileSync(this.notesFile, JSON.stringify(this.notes, null, 2));
        } catch (error) {
            console.error('Error saving notes:', error);
            throw error;
        }
    }

    /**
     * Set a new notes folder and reload notes from that location.
     * @param {string} folderPath - Path to the new notes folder
     * @returns {Object} Result of the operation
     */
    setNotesFolder(folderPath) {
        try {
            // Validate the path
            if (!folderPath || typeof folderPath !== 'string') {
                throw new Error('Invalid folder path provided');
            }

            // Resolve the absolute path
            const absolutePath = path.resolve(folderPath);
            
            // Create directory if it doesn't exist
            if (!fs.existsSync(absolutePath)) {
                fs.mkdirSync(absolutePath, { recursive: true });
            }

            // Update the folder and file paths
            this.notesFolder = absolutePath;
            this.notesFile = path.join(this.notesFolder, 'notes_storage.json');
            
            // Reload notes from the new location
            this.notes = this.loadNotes();

            return {
                success: true,
                message: `Notes folder set to: ${absolutePath}`,
                notesCount: Object.keys(this.notes).length
            };
        } catch (error) {
            throw new Error(`Failed to set notes folder: ${error.message}`);
        }
    }

    /**
     * Get the current notes folder path.
     * @returns {string} Current notes folder path
     */
    getNotesFolder() {
        return this.notesFolder; // absolute path to the notes folder
    }

    /**
     * Return all stored notes.
     * @returns {Object} All notes
     */
    getAllNotes() {
        return this.notes;
    }

    /**
     * Add a new note with content and timestamps.
     * @param {string} name - Note name
     * @param {string} content - Note content
     * @returns {Object} Created note data
     */
    addNote(name, content) {
        if (this.notes[name]) {
            throw new Error(`Note '${name}' already exists`);
        }

        const currentTime = new Date().toISOString();
        const noteData = {
            content: content,
            created_at: currentTime,
            modified_at: currentTime
        };

        this.notes[name] = noteData;
        this.saveNotes();
        
        return {
            name: name,
            ...noteData
        };
    }

    /**
     * Update existing note's content and modified time.
     * @param {string} name - Note name
     * @param {string} content - New content
     * @returns {Object} Updated note data
     */
    updateNote(name, content) {
        if (!this.notes[name]) {
            throw new Error(`Note '${name}' not found`);
        }

        const currentTime = new Date().toISOString();
        this.notes[name].content = content;
        this.notes[name].modified_at = currentTime;
        this.saveNotes();

        return {
            name: name,
            content: content,
            modified_at: currentTime
        };
    }

    /**
     * Remove a note and return its data.
     * @param {string} name - Note name
     * @returns {Object} Deleted note data
     */
    deleteNote(name) {
        if (!this.notes[name]) {
            throw new Error(`Note '${name}' not found`);
        }

        const deletedNote = this.notes[name];
        delete this.notes[name];
        this.saveNotes();

        return {
            name: name,
            ...deletedNote
        };
    }

    /**
     * Get a specific note by name.
     * @param {string} name - Note name
     * @returns {Object} Note data
     */
    getNote(name) {
        if (!this.notes[name]) {
            throw new Error(`Note '${name}' not found`);
        }

        return {
            name: name,
            ...this.notes[name]
        };
    }

    /**
     * Rename a note without changing its content.
     * @param {string} oldName - Current note name
     * @param {string} newName - New note name
     * @returns {Object} Renamed note data
     */
    renameNote(oldName, newName) {
        if (!this.notes[oldName]) {
            throw new Error(`Note '${oldName}' not found`);
        }

        if (this.notes[newName]) {
            throw new Error(`Note '${newName}' already exists`);
        }

        const currentTime = new Date().toISOString();
        const noteData = { ...this.notes[oldName] };
        noteData.modified_at = currentTime;

        // Add the note with the new name
        this.notes[newName] = noteData;
        
        // Remove the old note
        delete this.notes[oldName];
        
        this.saveNotes();

        return {
            name: newName,
            ...noteData
        };
    }
}

export default NoteStorage;
