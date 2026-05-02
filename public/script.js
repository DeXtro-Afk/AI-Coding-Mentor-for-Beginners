// ============================================================
// script.js - Frontend Logic for AI Coding Mentor
// ============================================================
// This file controls everything you see and interact with:
// - Switching between screens
// - Sending messages to the server
// - Displaying AI responses
// - Saving your session
// ============================================================

// ============================================================
// GLOBAL STATE
// Variables that track the current state of the app
// ============================================================

// The current session ID (unique ID for this conversation)
let currentSessionId = null;

// The programming language the user selected
let currentLanguage = 'General Programming';

// Whether the AI is currently responding (prevents double-sends)
let isLoading = false;

// The last AI message (used for "Explain Simpler" button)
let lastAiMessage = '';

// ============================================================
// SCREEN MANAGEMENT
// Functions to show/hide different "pages" of the app
// ============================================================

/**
 * Show a specific screen and hide all others.
 * @param {string} screenId - The ID of the screen div to show
 */
function showScreen(screenId) {
  // Get all screens
  const screens = document.querySelectorAll('.screen');

  // Remove 'active' class from every screen (hide them all)
  screens.forEach(screen => screen.classList.remove('active'));

  // Add 'active' class to the target screen (show just this one)
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
  }
}

// ============================================================
// LOADING SCREEN
// Animate the loading bar, then show the main menu
// ============================================================

/**
 * Runs the loading animation when the page first opens.
 * Simulates a % progress bar like a game loading screen.
 */
function runLoadingScreen() {
  const bar = document.getElementById('loading-bar');
  const loadingText = document.querySelector('.loading-text');
  let progress = 0;

  // Messages that appear at different points in loading
  const loadingMessages = [
    'Loading world...',
    'Placing blocks...',
    'Spawning AI mentor...',
    'Preparing lessons...',
    'Ready to learn!'
  ];

  // Animate the progress bar from 0% to 100%
  const interval = setInterval(() => {
    progress += Math.random() * 15 + 5; // Random increment (feels more real)

    if (progress >= 100) {
      progress = 100;
      clearInterval(interval); // Stop the animation

      // Small delay, then show the main menu
      setTimeout(() => {
        showScreen('menu-screen');
      }, 400);
    }

    // Update the bar width
    bar.style.width = progress + '%';

    // Update the loading message based on progress
    const msgIndex = Math.floor((progress / 100) * (loadingMessages.length - 1));
    loadingText.textContent = loadingMessages[msgIndex] || 'Loading...';

  }, 120); // Run every 120ms
}

// ============================================================
// LANGUAGE SELECTION
// ============================================================

/**
 * Called when the user clicks a language block.
 * Saves the choice and goes to the chat screen.
 * @param {string} language - The chosen programming language
 */
function selectLanguage(language) {
  // Save the selected language
  currentLanguage = language;

  // Generate a new session ID for this learning session
  currentSessionId = generateSessionId();

  // Update the HUD display
  updateHUD();

  // Update chat welcome message
  const welcomeLang = document.getElementById('welcome-lang');
  if (welcomeLang) welcomeLang.textContent = language;

  // Highlight the selected language button
  document.querySelectorAll('.lang-block').forEach(btn => {
    btn.classList.remove('selected');
  });

  // Find and highlight the clicked button
  const langMap = {
    'Python': 'lang-python',
    'JavaScript': 'lang-js',
    'Java': 'lang-java',
    'C': 'lang-c',
    'C++': 'lang-cpp',
    'General Programming': 'lang-general'
  };
  const btnId = langMap[language];
  if (btnId) document.getElementById(btnId)?.classList.add('selected');

  // Show a welcome notification
  showToast(`🎮 Starting ${language} lessons!`);

  // Reset the chat panel to show the welcome message
  resetChatPanel();

  // Switch to chat screen
  showScreen('chat-screen');
}

/**
 * Change the language from within the chat screen.
 */
function changeLanguage() {
  showScreen('language-screen');
}

// ============================================================
// CHAT FUNCTIONALITY
// The core feature: sending messages and showing responses
// ============================================================

/**
 * Sends the user's message to the backend server.
 * The server then calls the Groq AI and returns a response.
 */
async function sendMessage() {
  // Get the input box
  const input = document.getElementById('chat-input');
  const message = input.value.trim();

  // Don't send if empty or already waiting for a response
  if (!message || isLoading) return;

  // Clear the input box
  input.value = '';

  // Add the user's message to the chat panel
  addMessageToChat('user', message);

  // Show the typing animation while waiting for AI
  setLoading(true);

  try {
    // Send the message to our backend server
    const response = await fetch('/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message,
        sessionId: currentSessionId,
        language: currentLanguage
      })
    });

    // Parse the JSON response
    const data = await response.json();

    // Check if the request was successful
    if (!response.ok) {
      throw new Error(data.error || 'Server error occurred');
    }

    // Save the session ID (in case it was created by the server)
    if (data.sessionId) {
      currentSessionId = data.sessionId;
      updateHUD();
    }

    // Save the AI's response (used by "Explain Simpler" button)
    lastAiMessage = data.message;

    // Display the AI's response
    addMessageToChat('ai', data.message);

  } catch (error) {
    // Show a friendly error message if something went wrong
    console.error('Chat error:', error);

    let errorMessage = '❌ Oops! Something went wrong.\n\n';

    if (error.message.includes('API Key')) {
      errorMessage += '🔑 Your API key might not be set correctly.\n';
      errorMessage += 'Check your .env file and make sure GROQ_API_KEY is filled in!';
    } else if (error.message.includes('fetch') || error.message.includes('network')) {
      errorMessage += '🌐 Cannot connect to the server.\n';
      errorMessage += 'Make sure you ran: npm start';
    } else {
      errorMessage += error.message;
    }

    addMessageToChat('ai', errorMessage);
  } finally {
    // Always stop the loading animation when done
    setLoading(false);
  }
}

/**
 * Control the loading state (shows/hides typing animation).
 * @param {boolean} loading - true = show loading, false = hide
 */
function setLoading(loading) {
  isLoading = loading;

  const sendBtn = document.getElementById('send-btn');
  const input = document.getElementById('chat-input');
  const quickBtns = document.querySelectorAll('.quick-btn');

  if (loading) {
    // Disable inputs while waiting
    sendBtn.disabled = true;
    input.disabled = true;
    quickBtns.forEach(btn => btn.disabled = true);

    // Show typing animation
    showTypingIndicator();
  } else {
    // Re-enable inputs when done
    sendBtn.disabled = false;
    input.disabled = false;
    quickBtns.forEach(btn => btn.disabled = false);

    // Remove typing animation
    removeTypingIndicator();

    // Focus back on the input box
    input.focus();
  }
}

/**
 * Adds a message bubble to the chat panel.
 * @param {'user'|'ai'} sender - Who is sending the message
 * @param {string} text - The message content
 */
function addMessageToChat(sender, text) {
  const panel = document.getElementById('chat-panel');

  // Hide the welcome message once the first message appears
  const welcome = document.getElementById('chat-welcome');
  if (welcome && welcome.style.display !== 'none') {
    welcome.style.display = 'none';
  }

  // Create the message container div
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-message chat-message--${sender}`;

  // Label (You / AI Mentor)
  const label = document.createElement('div');
  label.className = 'msg-label';
  label.textContent = sender === 'user' ? '👤 You' : '🤖 AI Mentor';

  // Message bubble
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  // For AI messages, render markdown-style formatting
  if (sender === 'ai') {
    bubble.innerHTML = formatAIMessage(text);
  } else {
    // For user messages, just use plain text (safer — avoids XSS)
    bubble.textContent = text;
  }

  // Timestamp
  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = formatTime(new Date());

  // Assemble the message
  msgDiv.appendChild(label);
  msgDiv.appendChild(bubble);
  msgDiv.appendChild(time);

  // Add to chat panel
  panel.appendChild(msgDiv);

  // Scroll to the bottom so the latest message is visible
  panel.scrollTop = panel.scrollHeight;
}

/**
 * Formats AI response text into HTML.
 * Converts markdown-like syntax (**, `, ```) to HTML.
 * @param {string} text - Raw text from AI
 * @returns {string} - HTML string
 */
function formatAIMessage(text) {
  // Escape HTML to prevent XSS
  let formatted = escapeHtml(text);

  // Convert code blocks (``` ... ```) to <pre><code> blocks
  formatted = formatted.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Convert inline code (` ... `) to <code> tags
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Convert **bold** to <strong>
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Convert *italic* to <em>
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Convert newlines to <br> for proper line breaks
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
}

/**
 * Escapes HTML special characters to prevent XSS injection.
 * @param {string} text - Raw text to escape
 * @returns {string} - Safe HTML string
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Shows the animated typing indicator (three bouncing dots).
 */
function showTypingIndicator() {
  const panel = document.getElementById('chat-panel');

  // Remove any existing typing indicator first
  removeTypingIndicator();

  const typingDiv = document.createElement('div');
  typingDiv.className = 'typing-indicator';
  typingDiv.id = 'typing-indicator';
  typingDiv.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <span class="typing-label">AI is thinking...</span>
  `;

  panel.appendChild(typingDiv);
  panel.scrollTop = panel.scrollHeight;
}

/**
 * Removes the typing indicator from the chat.
 */
function removeTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) indicator.remove();
}

// ============================================================
// QUICK ACTION BUTTONS
// ============================================================

/**
 * "Explain Simpler" button — asks AI to re-explain more simply.
 */
function askSimpler() {
  if (isLoading) return;
  const input = document.getElementById('chat-input');
  input.value = "I'm confused! Can you explain that again in an even simpler way? Use a very basic real-life example.";
  sendMessage();
}

/**
 * "Practice Question" button — asks AI for a beginner exercise.
 */
function askPractice() {
  if (isLoading) return;
  const input = document.getElementById('chat-input');
  input.value = `Give me a simple practice problem for ${currentLanguage} that a complete beginner can try. Make it fun and easy!`;
  sendMessage();
}

/**
 * "Show Example" button — asks for a code example.
 */
function askExample() {
  if (isLoading) return;
  const input = document.getElementById('chat-input');
  input.value = `Show me a simple, short code example in ${currentLanguage} with comments explaining each line.`;
  sendMessage();
}

// ============================================================
// HISTORY (PAST SESSIONS)
// ============================================================

/**
 * Loads all past sessions from the backend database
 * and displays them in the history screen.
 */
async function loadHistory() {
  const historyList = document.getElementById('history-list');

  // Show loading state
  historyList.innerHTML = `
    <div class="history-loading">
      <div class="pixel-spinner"></div>
      <p>Loading sessions...</p>
    </div>
  `;

  try {
    // Fetch history from our backend
    const response = await fetch('/history');
    const data = await response.json();

    if (!data.success || data.sessions.length === 0) {
      // No sessions found
      historyList.innerHTML = `
        <div class="history-empty">
          📦 No past sessions yet!<br><br>
          Start a new learning session and<br>
          your chats will appear here.
        </div>
      `;
      return;
    }

    // Clear and build the session list
    historyList.innerHTML = '';

    data.sessions.forEach(session => {
      const card = buildSessionCard(session);
      historyList.appendChild(card);
    });

  } catch (error) {
    console.error('Error loading history:', error);
    historyList.innerHTML = `
      <div class="history-empty">
        ❌ Could not load history.<br><br>
        Make sure the server is running!
      </div>
    `;
  }
}

/**
 * Builds a session card DOM element.
 * @param {Object} session - Session data from the backend
 * @returns {HTMLElement} - The card element
 */
function buildSessionCard(session) {
  const card = document.createElement('div');
  card.className = 'session-card';

  // Format the date
  const date = new Date(session.lastActivity);
  const dateStr = date.toLocaleDateString() + ' at ' + formatTime(date);

  // Create preview text (truncate long messages)
  const preview = truncate(session.firstMessage, 60);

  card.innerHTML = `
    <div class="session-info">
      <div class="session-lang">📚 ${session.language} • ${session.messageCount} messages</div>
      <div class="session-preview">💬 ${escapeHtml(preview)}</div>
      <div class="session-meta">🕐 ${dateStr} • ID: ${session.sessionId.slice(0, 8)}...</div>
    </div>
    <div class="session-actions">
      <button class="session-btn session-btn--load"
              onclick="loadSession('${session.sessionId}', '${escapeHtml(session.language)}')">
        ▶ Load
      </button>
      <button class="session-btn session-btn--delete"
              onclick="deleteSession('${session.sessionId}', this)">
        🗑 Delete
      </button>
    </div>
  `;

  return card;
}

/**
 * Loads a specific past session into the chat screen.
 * @param {string} sessionId - The session to load
 * @param {string} language - The language used in that session
 */
async function loadSession(sessionId, language) {
  try {
    showToast('📂 Loading session...');

    const response = await fetch(`/session/${sessionId}`);
    const data = await response.json();

    if (!data.success) {
      showToast('❌ Could not load session!', 'error');
      return;
    }

    // Set global state
    currentSessionId = sessionId;
    currentLanguage = language;
    updateHUD();

    // Reset and rebuild chat panel
    resetChatPanel();

    // Add all messages from the session
    data.messages.forEach(msg => {
      addMessageToChat('user', msg.userMessage);
      addMessageToChat('ai', msg.aiResponse);
    });

    // Switch to chat screen
    showScreen('chat-screen');
    showToast(`✅ Session loaded! (${data.messages.length} messages)`);

  } catch (error) {
    console.error('Error loading session:', error);
    showToast('❌ Failed to load session.', 'error');
  }
}

/**
 * Deletes a session from the database.
 * @param {string} sessionId - The session to delete
 * @param {HTMLElement} btnEl - The delete button (to remove the card)
 */
async function deleteSession(sessionId, btnEl) {
  // Ask for confirmation first
  if (!confirm('Are you sure you want to delete this session? This cannot be undone!')) return;

  try {
    const response = await fetch(`/session/${sessionId}`, { method: 'DELETE' });
    const data = await response.json();

    if (data.success) {
      // Remove the session card from the UI
      const card = btnEl.closest('.session-card');
      card.style.opacity = '0';
      card.style.transform = 'translateX(100%)';
      card.style.transition = 'all 0.3s ease';
      setTimeout(() => card.remove(), 300);
      showToast('🗑 Session deleted!');
    } else {
      showToast('❌ Could not delete session!', 'error');
    }
  } catch (error) {
    showToast('❌ Server error!', 'error');
  }
}

// ============================================================
// ABOUT SCREEN HELPERS
// ============================================================

/**
 * Opens a chat with a pre-filled question.
 * Called from the "tips" list in the About screen.
 * @param {string} question - The question to pre-fill
 */
function openChat(question) {
  // If no session exists, go to language selection first
  if (!currentSessionId) {
    showScreen('language-screen');
    showToast('💡 Pick a language first, then ask your question!');
    return;
  }

  showScreen('chat-screen');

  // Pre-fill the input after a short delay
  setTimeout(() => {
    const input = document.getElementById('chat-input');
    input.value = question;
    input.focus();
  }, 100);
}

// ============================================================
// UI HELPERS
// Small utility functions for the interface
// ============================================================

/**
 * Updates the HUD bar with current session info.
 */
function updateHUD() {
  const sessionLabel = document.getElementById('hud-session-label');
  const langLabel = document.getElementById('hud-lang-label');

  if (sessionLabel) {
    const shortId = currentSessionId ? currentSessionId.slice(0, 8) + '...' : 'New';
    sessionLabel.textContent = `Session: ${shortId}`;
  }

  if (langLabel) {
    const icons = {
      'Python': '🐍',
      'JavaScript': '⚡',
      'Java': '☕',
      'C': '⚙️',
      'C++': '🔧',
      'General Programming': '🌐'
    };
    const icon = icons[currentLanguage] || '📚';
    langLabel.textContent = `${icon} ${currentLanguage}`;
  }
}

/**
 * Resets the chat panel to its initial welcome state.
 */
function resetChatPanel() {
  const panel = document.getElementById('chat-panel');
  panel.innerHTML = `
    <div class="chat-welcome" id="chat-welcome">
      <div class="welcome-icon">🤖</div>
      <p>Welcome, <strong>Coder</strong>! I'm your AI mentor.</p>
      <p>Ask me anything about <span id="welcome-lang">${currentLanguage}</span>!</p>
      <p class="welcome-tip">💡 Tip: Try asking <em>"What is a variable?"</em></p>
    </div>
  `;
}

/**
 * Shows a toast notification at the bottom of the screen.
 * @param {string} message - The notification text
 * @param {'success'|'error'} type - The notification type
 */
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast show' + (type === 'error' ? ' error' : '');

  // Hide after 3 seconds
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

/**
 * Generates a unique session ID using timestamp + random number.
 * @returns {string} - A unique session ID
 */
function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

/**
 * Formats a Date object as HH:MM AM/PM.
 * @param {Date} date - The date to format
 * @returns {string} - Formatted time string
 */
function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Truncates a string to a maximum length.
 * @param {string} str - The string to truncate
 * @param {number} max - Maximum length
 * @returns {string} - Truncated string with ... if needed
 */
function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================

// Allow pressing Enter to send a message
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('chat-input');
  if (input) {
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });
  }

  // Also show character count in the input hint
  if (input) {
    input.addEventListener('input', () => {
      const hint = document.getElementById('input-hint');
      const remaining = 500 - input.value.length;
      if (remaining < 100) {
        hint.textContent = `${remaining} characters remaining`;
        hint.style.color = remaining < 30 ? '#c03030' : '#d4a017';
      } else {
        hint.textContent = 'Press Enter to send • Max 500 characters';
        hint.style.color = '';
      }
    });
  }
});

// ============================================================
// APP INITIALIZATION
// Runs when the page loads
// ============================================================

/**
 * Main initialization function.
 * Called automatically when the DOM is ready.
 */
function init() {
  console.log('🎮 AI Coding Mentor — Initializing...');

  // Start the loading screen animation
  runLoadingScreen();

  // Set the default language in HUD
  updateHUD();

  console.log('✅ App initialized!');
}

// Start the app!
init();
