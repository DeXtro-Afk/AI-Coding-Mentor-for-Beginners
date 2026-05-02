// ============================================================
// server.js - Main Backend Server for AI Coding Mentor
// ============================================================
// This is the "brain" that connects the frontend (website),
// the AI (Groq API), and the database (MongoDB).

// --- Load environment variables from .env file ---
require('dotenv').config();

// --- Import required packages ---
const express = require('express');       // Web framework to create our server
const mongoose = require('mongoose');     // Library to talk to MongoDB
const cors = require('cors');             // Allows our frontend to talk to this server
const fetch = require('node-fetch');      // Used to call the Groq AI API
const path = require('path');            // Helps manage file/folder paths
const { v4: uuidv4 } = require('uuid'); // Generates unique IDs for sessions

// --- Import our Chat model (the database template we created) ---
const Chat = require('./models/chat');

// --- Create the Express app ---
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARE SETUP
// Middleware = functions that run on every request before your code
// ============================================================
app.use(cors());                          // Allow cross-origin requests
app.use(express.json());                  // Parse JSON from request body
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend files

// ============================================================
// CONNECT TO MONGODB
// ============================================================
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully!');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error.message);
    console.log('💡 Make sure MongoDB is running on your computer!');
    console.log('   Install MongoDB: https://www.mongodb.com/try/download/community');
  });

// ============================================================
// AI SYSTEM PROMPT
// This is the "personality" and "rules" we give the AI.
// It tells the AI HOW to behave as a coding mentor.
// ============================================================
const SYSTEM_PROMPT = `You are a friendly AI Coding Mentor for absolute beginners.

Rules you MUST follow:
1. Always explain in simple terms (like teaching a 10-year-old)
2. Avoid jargon unless you explain it clearly first
3. Break answers into numbered steps
4. Use short, simple code examples with comments
5. After every explanation, give ONE small practice problem
6. Always encourage the user with positive words
7. Never give overly long answers — keep it concise and friendly
8. If the user seems confused, re-explain more simply with a different approach
9. Format code in code blocks for clarity
10. Use emojis occasionally to keep it fun and engaging

Remember: Your goal is to make programming feel easy, fun, and achievable for beginners!`;

// ============================================================
// ROUTE 1: POST /chat
// This is called when the user sends a message.
// It:
//   1. Gets the last 5 messages from the database (for context)
//   2. Sends everything to the Groq AI API
//   3. Gets the AI's response
//   4. Saves both messages to the database
//   5. Returns the AI's response to the frontend
// ============================================================
app.post('/chat', async (req, res) => {
  try {
    // Extract data from the request body
    const { message, sessionId, language } = req.body;

    // Validate that message is provided
    if (!message || message.trim() === '') {
      return res.status(400).json({
        error: 'Please provide a message!',
        hint: 'The "message" field cannot be empty.'
      });
    }

    // Use provided sessionId or generate a new one
    const currentSessionId = sessionId || uuidv4();

    // --- Step 1: Fetch the last 5 messages for context ---
    const previousChats = await Chat.find({ sessionId: currentSessionId })
      .sort({ createdAt: -1 })   // Get newest first
      .limit(5)                   // Only last 5 messages
      .select('userMessage aiResponse'); // Only get these two fields

    // Reverse so they're in chronological order (oldest first)
    const contextMessages = previousChats.reverse();

    // --- Step 2: Build the conversation history for the AI ---
    // The AI needs to see previous messages to remember context
    const conversationHistory = [];

    // Add each previous message pair to the history
    contextMessages.forEach(chat => {
      conversationHistory.push({
        role: 'user',
        content: chat.userMessage
      });
      conversationHistory.push({
        role: 'assistant',
        content: chat.aiResponse
      });
    });

    // Add the current user message
    const currentLanguage = language || 'General Programming';
    conversationHistory.push({
      role: 'user',
      content: `[Teaching ${currentLanguage}] ${message}`
    });

    // --- Step 3: Call the Groq AI API ---
    console.log(`📨 Sending message to Groq AI... (Session: ${currentSessionId.slice(0, 8)}...)`);

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // This is where the API key is used — loaded safely from .env
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",  // Fast and capable model from Groq (Llama 3 8B)
        messages: [
          // First message is always the system prompt (AI's personality)
          { role: 'system', content: SYSTEM_PROMPT },
          // Then the conversation history with the current message
          ...conversationHistory
        ],
        temperature: 0.7,     // Controls creativity (0 = robotic, 1 = very creative)
        max_tokens: 1024,     // Maximum length of AI response
        stream: false         // We want the full response at once (not streaming)
      })
    });

    // Check if the API call was successful
    if (!groqResponse.ok) {
      const errorData = await groqResponse.json();
      console.error('❌ Groq API Error:', errorData);

      // Give a beginner-friendly error message
      if (groqResponse.status === 401) {
        return res.status(500).json({
          error: 'API Key not valid! Please check your .env file.',
          hint: 'Make sure GROQ_API_KEY is set correctly in the .env file.'
        });
      }

      return res.status(500).json({
        error: 'The AI is taking a break! Please try again.',
        details: errorData
      });
    }

    // Parse the AI's response
    const groqData = await groqResponse.json();
    const aiMessage = groqData.choices[0].message.content;

    console.log('✅ Got response from AI!');

    // --- Step 4: Save the chat to MongoDB ---
    const newChat = new Chat({
      sessionId: currentSessionId,
      userMessage: message,
      aiResponse: aiMessage,
      language: currentLanguage
    });

    await newChat.save();
    console.log('💾 Chat saved to database!');

    // --- Step 5: Send the response back to the frontend ---
    res.json({
      success: true,
      sessionId: currentSessionId,
      message: aiMessage,
      language: currentLanguage
    });

  } catch (error) {
    // If something unexpected goes wrong, send a friendly error
    console.error('❌ Server Error:', error);
    res.status(500).json({
      error: 'Oops! Something went wrong on the server.',
      hint: 'Check the server console for more details.',
      details: error.message
    });
  }
});

// ============================================================
// ROUTE 2: GET /history
// Returns all past chat sessions grouped by sessionId.
// Used to show "Previous Sessions" in the frontend.
// ============================================================
app.get('/history', async (req, res) => {
  try {
    // Get all chats, sort by newest first
    const allChats = await Chat.find({})
      .sort({ createdAt: -1 })
      .select('sessionId userMessage aiResponse language createdAt');

    // Group chats by sessionId (like grouping emails by conversation thread)
    const sessionsMap = {};

    allChats.forEach(chat => {
      const sid = chat.sessionId;

      if (!sessionsMap[sid]) {
        // First time we see this sessionId, create a new entry
        sessionsMap[sid] = {
          sessionId: sid,
          language: chat.language,
          lastActivity: chat.createdAt,
          messageCount: 0,
          firstMessage: '',     // Will be the first user message in the session
          messages: []
        };
      }

      sessionsMap[sid].messageCount++;
      sessionsMap[sid].messages.push({
        userMessage: chat.userMessage,
        aiResponse: chat.aiResponse,
        createdAt: chat.createdAt
      });
    });

    // Get first messages by sorting messages chronologically within each session
    Object.values(sessionsMap).forEach(session => {
      session.messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      session.firstMessage = session.messages[0]?.userMessage || 'No messages';
    });

    // Convert the map to an array for easy use in the frontend
    const sessions = Object.values(sessionsMap);

    res.json({
      success: true,
      totalSessions: sessions.length,
      sessions: sessions
    });

  } catch (error) {
    console.error('❌ Error fetching history:', error);
    res.status(500).json({
      error: 'Could not load chat history!',
      details: error.message
    });
  }
});

// ============================================================
// ROUTE 3: GET /session/:sessionId
// Returns all messages for a specific session.
// Used when the user clicks "Load" on a previous session.
// ============================================================
app.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const messages = await Chat.find({ sessionId })
      .sort({ createdAt: 1 }) // Oldest first (chronological order)
      .select('userMessage aiResponse language createdAt');

    if (messages.length === 0) {
      return res.status(404).json({
        error: 'Session not found!',
        hint: 'The session ID you provided does not exist.'
      });
    }

    res.json({
      success: true,
      sessionId,
      language: messages[0].language,
      messages
    });

  } catch (error) {
    console.error('❌ Error fetching session:', error);
    res.status(500).json({
      error: 'Could not load session!',
      details: error.message
    });
  }
});

// ============================================================
// ROUTE 4: DELETE /session/:sessionId
// Deletes all messages for a session.
// ============================================================
app.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    await Chat.deleteMany({ sessionId });

    res.json({
      success: true,
      message: 'Session deleted successfully!'
    });
  } catch (error) {
    res.status(500).json({ error: 'Could not delete session!' });
  }
});

// ============================================================
// SERVE FRONTEND
// This catches any route not handled above and serves index.html
// ============================================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// START THE SERVER
// ============================================================
app.listen(PORT, () => {
  console.log('');
  console.log('🎮 ======================================== 🎮');
  console.log('   AI CODING MENTOR - Server is Running!');
  console.log(`   Open: http://localhost:${PORT}`);
  console.log('🎮 ======================================== 🎮');
  console.log('');
  console.log('📋 Checklist:');
  console.log(`   ✅ Server started on port ${PORT}`);
  console.log(`   ${process.env.GROQ_API_KEY !== 'PASTE_YOUR_API_KEY_HERE' ? '✅' : '❌'} GROQ_API_KEY is set`);
  console.log(`   ⏳ MongoDB connecting to: ${process.env.MONGODB_URI}`);
  console.log('');
});
