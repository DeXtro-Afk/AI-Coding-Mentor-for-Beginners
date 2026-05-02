# 🎮 AI Coding Mentor for Beginners — Setup Guide

> A Minecraft-inspired AI tutor for learning programming, powered by Groq AI.

---

## 📁 Project Structure

```
AI Coding Mentor for Beginners/
├── public/                 ← Frontend files (served by Express)
│   ├── index.html          ← Main HTML (all 5 screens)
│   ├── style.css           ← Minecraft-style CSS
│   └── script.js           ← Frontend logic (chat, sessions)
├── models/
│   └── chat.js             ← MongoDB schema for chat messages
├── server.js               ← Express backend + Groq API + routes
├── package.json            ← Dependencies list
├── .env                    ← 🔑 Your secret API keys (don't share!)
├── .env.example            ← Example .env (safe to share)
└── .gitignore              ← Files to exclude from git
```

---

## ⚙️ Step 1 — Prerequisites

Before you start, make sure you have these installed:

| Tool | Purpose | Download |
|------|---------|----------|
| Node.js (v18+) | Run the server | https://nodejs.org |
| MongoDB Community | Database | https://www.mongodb.com/try/download/community |

To check if Node.js is installed:
```bash
node --version
# Should print v18.x.x or higher
```

---

## 🔑 Step 2 — Get Your Groq API Key

1. Go to **https://console.groq.com**
2. Sign up for a free account
3. Click **"API Keys"** in the sidebar
4. Click **"Create API Key"**
5. Copy the key (it starts with `gsk_...`)

---

## 📝 Step 3 — Configure Your .env File

Open the `.env` file in the project root and paste your key:

```env
GROQ_API_KEY=gsk_your_actual_key_here
MONGODB_URI=mongodb://localhost:27017/ai_coding_mentor
PORT=3000
```

> ⚠️ **Never share your `.env` file or commit it to GitHub!**
> The `.gitignore` already protects it.

---

## 🍃 Step 4 — Start MongoDB

### On Windows:
Option A — MongoDB runs as a service (auto-started after install):
```powershell
# Check if it's running
Get-Service -Name MongoDB
```

Option B — Start it manually:
```powershell
# Find where mongod is installed (usually one of these):
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath "C:\data\db"
```

> 💡 Create the data folder first if needed:
> ```powershell
> mkdir C:\data\db
> ```

---

## 📦 Step 5 — Install Dependencies

```bash
npm install
```

This installs all packages listed in `package.json`.

---

## 🚀 Step 6 — Start the Server

```bash
npm start
```

You should see:
```
🎮 ======================================== 🎮
   AI CODING MENTOR - Server is Running!
   Open: http://localhost:3000
🎮 ======================================== 🎮

✅ Server started on port 3000
✅ GROQ_API_KEY is set
✅ Connected to MongoDB successfully!
```

---

## 🌐 Step 7 — Open the App

Open your browser and go to:
```
http://localhost:3000
```

You'll see the **Minecraft-style loading screen** → **Main Menu**.

---

## 🎮 Using the App

### Main Menu
- **Start Learning** → Choose a language and start chatting
- **Past Sessions** → See and reload previous conversations
- **How To Use** → Tips and starter questions

### Chat Screen
- Type any question in the input box and press **Enter** or click **SEND**
- Use the **quick action buttons**:
  - 🔄 **Explain Simpler** — Re-explains the last topic more simply
  - 📝 **Practice Question** — Gives you a beginner exercise
  - 💡 **Show Example** — Shows a code example with comments
- Click 🌐 in the top-right to change the programming language

---

## 🔧 API Endpoints (for developers)

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/chat` | Send a message, get AI response |
| `GET` | `/history` | Get all sessions grouped by ID |
| `GET` | `/session/:id` | Get all messages in a session |
| `DELETE` | `/session/:id` | Delete a session |

### POST /chat — Request Body:
```json
{
  "message": "What is a variable?",
  "sessionId": "session_abc123",
  "language": "Python"
}
```

### POST /chat — Response:
```json
{
  "success": true,
  "sessionId": "session_abc123",
  "message": "Great question! A variable is like a box...",
  "language": "Python"
}
```

---

## 🐛 Troubleshooting

### "Cannot connect to MongoDB"
- Make sure MongoDB is running (see Step 4)
- Check `MONGODB_URI` in your `.env` file

### "API Key not valid"
- Make sure you pasted your Groq key correctly in `.env`
- Restart the server after editing `.env`

### "Cannot connect to server" in browser
- Make sure you ran `npm start`
- Check the server is running at `http://localhost:3000`

### Port already in use
```bash
# Change the PORT in .env
PORT=3001
```

---

## 🔁 Development Mode (auto-restart)

```bash
npm run dev
```

Uses `nodemon` to automatically restart the server whenever you save a file.

---

## 📚 Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3 (Vanilla), JavaScript (Vanilla) |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| AI | Groq API (llama3-8b-8192) |
| Font | "Press Start 2P" (Google Fonts) |

---

*Built with ❤️ for beginner coders everywhere!*
