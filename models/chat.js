// ============================================================
// models/chat.js - MongoDB Schema for Chat Messages
// ============================================================
// This file defines how chat data is stored in MongoDB.
// Think of it like designing a table in a spreadsheet —
// each "field" is one column of information we save.

const mongoose = require('mongoose');

// Define the shape of each chat document (like a template)
const chatSchema = new mongoose.Schema({
  // sessionId: uniquely identifies a user's conversation session
  sessionId: {
    type: String,
    required: true,
    index: true // makes searching by sessionId faster
  },

  // userMessage: what the user typed
  userMessage: {
    type: String,
    required: true
  },

  // aiResponse: what the AI replied
  aiResponse: {
    type: String,
    required: true
  },

  // language: the programming language the user chose (e.g., Python, JavaScript)
  language: {
    type: String,
    default: 'General'
  },

  // createdAt: automatically set to the current time when saved
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Export the model so server.js can use it to read/write data
module.exports = mongoose.model('Chat', chatSchema);
