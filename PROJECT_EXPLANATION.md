# 🎮 AI Coding Mentor for Beginners — Project Explanation

---

## What is this project?

It's a **website that acts like a coding tutor**. You open it, pick a programming language
(Python, JavaScript, Java, C, C++), and chat with an AI that teaches you step-by-step —
like a friendly teacher. The UI looks like **Minecraft** (pixel fonts, dark theme, blocky buttons).

---

## How does it work? (Big Picture)

```
You (Browser) → sends message → Our Server → asks Groq AI → gets answer → saves to MongoDB → sends back to browser → shows on screen
```

There are **3 layers**:
1. **Frontend** — what you see (HTML / CSS / JavaScript)
2. **Backend** — the server that connects everything (Node.js + Express)
3. **Database** — stores your chat history (MongoDB)

---

## File-by-File Explanation

---

### 1. `package.json` — The project's ingredient list

```json
"dependencies": {
  "express":    "^4.18.2",   // framework to build the server
  "mongoose":   "^7.6.3",   // connects to MongoDB
  "dotenv":     "^16.3.1",  // reads secret keys from .env file
  "cors":       "^2.8.5",   // allows browser to talk to server
  "node-fetch": "^2.7.0",   // lets server call the Groq AI API
  "uuid":       "^9.0.0"    // generates unique session IDs
}
```

> Think of it like a `requirements.txt`.
> Run `npm install` to download all of these packages.

---

### 2. `.env` — Secret keys (never share this file)

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx    ← your AI API key
MONGODB_URI=mongodb://localhost:27017/ai_coding_mentor
PORT=3000
```

> These are like passwords. We never write them directly in code.
> We load them safely at runtime using the `dotenv` package.

---

### 3. `models/chat.js` — Database blueprint

```js
const chatSchema = new mongoose.Schema({
  sessionId:   { type: String, required: true }, // which conversation?
  userMessage: { type: String, required: true }, // what the user typed
  aiResponse:  { type: String, required: true }, // what AI replied
  language:    { type: String, default: 'General' }, // Python, JS, etc.
  createdAt:   { type: Date,   default: Date.now }   // when it happened
});

module.exports = mongoose.model('Chat', chatSchema);
```

> This defines the **shape of one chat message** stored in MongoDB.
> Every time someone chats, one record like this is saved to the database.

---

### 4. `server.js` — The brain (most important file)

#### Setup & Middleware

```js
require('dotenv').config();          // load .env file
const express  = require('express');
const mongoose = require('mongoose');
const fetch    = require('node-fetch');
const Chat     = require('./models/chat');

const app = express();
app.use(express.json());             // read JSON from requests
app.use(express.static('public'));   // serve our HTML/CSS/JS files
```

#### Connect to MongoDB

```js
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB!'));
```

#### The AI's personality (System Prompt)

```js
const SYSTEM_PROMPT = `You are a friendly AI Coding Mentor for absolute beginners.
- Explain like teaching a 10-year-old
- Break answers into numbered steps
- Use short code examples with comments
- Give ONE practice problem after every explanation
- Keep answers short and encouraging`;
```

> This is sent to the AI with every request so it always behaves like a beginner tutor.

#### Main Route — POST /chat

```js
app.post('/chat', async (req, res) => {
  const { message, sessionId, language } = req.body;

  // Step 1: Get last 5 messages from DB (gives AI memory of the conversation)
  const previousChats = await Chat.find({ sessionId })
    .sort({ createdAt: -1 })
    .limit(5);

  // Step 2: Build conversation history array for the AI
  const history = previousChats.reverse().flatMap(chat => ([
    { role: 'user',      content: chat.userMessage },
    { role: 'assistant', content: chat.aiResponse  }
  ]));

  // Step 3: Call Groq AI API
  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,  // key from .env
      'Content-Type':  'application/json'
    },
    body: JSON.stringify({
      model: 'llama3-8b-8192',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },  // AI personality
        ...history,                                   // past messages
        { role: 'user', content: `[${language}] ${message}` } // current message
      ]
    })
  });

  const aiMessage = (await groqResponse.json()).choices[0].message.content;

  // Step 4: Save both messages to MongoDB
  await new Chat({
    sessionId,
    userMessage: message,
    aiResponse:  aiMessage,
    language
  }).save();

  // Step 5: Send response back to the browser
  res.json({ success: true, message: aiMessage, sessionId });
});
```

> **This is the core of the whole app.**
> Every chat message flows through this single route.

#### History Route — GET /history

```js
app.get('/history', async (req, res) => {
  const allChats = await Chat.find({}).sort({ createdAt: -1 });
  // Groups chats by sessionId and sends back to browser
  res.json({ sessions: groupedSessions });
});
```

#### Session Route — GET /session/:id

```js
app.get('/session/:sessionId', async (req, res) => {
  const messages = await Chat.find({ sessionId: req.params.sessionId })
    .sort({ createdAt: 1 }); // oldest first
  res.json({ success: true, messages });
});
```

---

### 5. `public/index.html` — All screens in one file

The site has **5 screens**, all in one HTML file. Only one is visible at a time:

```html
<div id="loading-screen"  class="screen active"> <!-- animated loading bar --> </div>
<div id="menu-screen"     class="screen">        <!-- main menu buttons    --> </div>
<div id="language-screen" class="screen">        <!-- pick a language       --> </div>
<div id="chat-screen"     class="screen">        <!-- the actual chat UI    --> </div>
<div id="history-screen"  class="screen">        <!-- past sessions list    --> </div>
```

JavaScript adds/removes the `active` CSS class to switch between screens.

---

### 6. `public/style.css` — Minecraft look

```css
/* Design tokens */
:root {
  --color-bg:   #1a1a1a;           /* very dark background    */
  --mc-green:   #5d8a47;           /* Minecraft grass green   */
  --font-pixel: 'Press Start 2P';  /* pixel font from Google  */
}

/* Blocky Minecraft-style button */
.mc-button {
  font-family: var(--font-pixel);
  background: var(--mc-green);
  border-bottom: 4px solid #3d6030;          /* gives a 3D block effect  */
  box-shadow: 4px 4px 0px rgba(0,0,0,0.6);  /* pixel drop shadow        */
  /* NO border-radius — everything is square on purpose */
}

/* Hover lifts the button slightly */
.mc-button:hover {
  transform: translateY(-2px);
  filter: brightness(1.2);
}
```

> No rounded corners anywhere. Everything is blocky — that's the Minecraft style.

---

### 7. `public/script.js` — Frontend logic

#### Switch screens

```js
function showScreen(screenId) {
  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  // Show only the target screen
  document.getElementById(screenId).classList.add('active');
}
```

#### Select a language and start chat

```js
function selectLanguage(language) {
  currentLanguage  = language;
  currentSessionId = 'session_' + Date.now(); // new unique ID
  showScreen('chat-screen');
}
```

#### Send a message to the server

```js
async function sendMessage() {
  const message = document.getElementById('chat-input').value.trim();
  if (!message || isLoading) return;

  addMessageToChat('user', message);  // show user's message immediately
  setLoading(true);                   // show typing animation

  const response = await fetch('/chat', {        // call our Express server
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      message,
      sessionId: currentSessionId,
      language:  currentLanguage
    })
  });

  const data = await response.json();
  addMessageToChat('ai', data.message);  // display AI's reply
  setLoading(false);
}
```

#### Quick action buttons

```js
function askSimpler() {
  document.getElementById('chat-input').value =
    "I'm confused! Explain that again more simply with a real-life example.";
  sendMessage();
}

function askPractice() {
  document.getElementById('chat-input').value =
    `Give me a simple practice problem for ${currentLanguage} that a beginner can try.`;
  sendMessage();
}

function askExample() {
  document.getElementById('chat-input').value =
    `Show me a short code example in ${currentLanguage} with comments on each line.`;
  sendMessage();
}
```

#### Load past session

```js
async function loadSession(sessionId, language) {
  const response = await fetch(`/session/${sessionId}`);
  const data     = await response.json();

  currentSessionId = sessionId;
  currentLanguage  = language;
  resetChatPanel();

  // Re-display every saved message
  data.messages.forEach(msg => {
    addMessageToChat('user', msg.userMessage);
    addMessageToChat('ai',   msg.aiResponse);
  });

  showScreen('chat-screen');
}
```

---

## API Endpoints Summary

| Method   | Route               | What it does                          |
|----------|---------------------|---------------------------------------|
| `POST`   | `/chat`             | Send message → get AI reply, save to DB |
| `GET`    | `/history`          | Get all sessions grouped by ID        |
| `GET`    | `/session/:id`      | Load all messages in one session      |
| `DELETE` | `/session/:id`      | Delete a session from the database    |

---

## How to Run

```bash
# 1. Add your Groq API key to .env
GROQ_API_KEY=gsk_your_key_here

# 2. Make sure MongoDB is running on your PC

# 3. Install packages (first time only)
npm install

# 4. Start the server
npm start

# 5. Open browser
http://localhost:3000
```

---

## Script to Explain to Teacher

> *"Our project is an AI-powered coding tutor for beginners with a Minecraft-style interface.*
>
> *The frontend is pure HTML, CSS, and JavaScript — no frameworks. It has 5 screens that
> show and hide using a CSS class called `active`. The user picks a programming language,
> types a question, and it gets sent to our Express server using the `fetch` API.*
>
> *The server retrieves the last 5 messages from MongoDB to give the AI memory of the
> conversation, then calls the Groq API — which runs the Llama 3 AI model. We send a
> system prompt that forces the AI to always explain things simply and give practice problems.*
>
> *The AI's response is saved to MongoDB with a session ID, and sent back to the browser
> to display. Users can also reload past sessions from the history screen.*
>
> *The design uses a pixel font called Press Start 2P and square blocky borders with no
> border-radius anywhere — giving it the Minecraft feel."*
