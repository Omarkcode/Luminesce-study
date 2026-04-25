/* ============================================================
   study-buddy.js — AI chat page with Groq + knowledge panels
   ============================================================ */

// ── Supabase auth gate ────────────────────────────────────────

const sb = supabase.createClient(
  'https://rdnswueidjqnxgkhvrjf.supabase.co',
  'sb_publishable_EWpwtIRhvsIQMbNaiKIrPg_vLbgOMNp'
);

(async () => {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }
})();

// ── Background ────────────────────────────────────────────────

startBackground();

// ── Exit ──────────────────────────────────────────────────────

document.getElementById('btnExit').addEventListener('click', () => {
  window.location.href = 'menu.html';
});

// ── Knowledge Finder panel ────────────────────────────────────

window.KF_EDIT_MODE = true;

window.onKnowledgePanelEdit = (panel) => {
  const input = document.getElementById('sbInput');
  input.value = `Please update and improve this knowledge panel:\n[KNOWLEDGE_PANEL]\n${JSON.stringify(panel, null, 2)}\n[/KNOWLEDGE_PANEL]`;
  autoResizeInput(input);
  input.focus();
  document.getElementById('kfPanel').hidden = true;
  document.getElementById('btnKF').classList.remove('sb-btn--active');
};

document.getElementById('btnKF').addEventListener('click', () => {
  const panel = document.getElementById('kfPanel');
  const btn   = document.getElementById('btnKF');
  const open  = panel.hidden;

  panel.hidden = !open;
  btn.classList.toggle('sb-btn--active', open);

  if (open) renderKnowledgeFinder(document.getElementById('kfList'));
});

// ── Groq system prompt ────────────────────────────────────────

const SYSTEM_PROMPT = `You are Study Buddy, a warm and encouraging AI study assistant inside the Luminesce Study app. You help students understand difficult topics, stay motivated, and build great study materials.

When a student asks you to create flashcards, vocab cards, or study cards, respond with a knowledge panel in this exact format:

[KNOWLEDGE_PANEL]
{
  "name": "descriptive name for the set",
  "type": "flashcard",
  "questions": [
    {"front": "term or question", "back": "definition or answer"}
  ]
}
[/KNOWLEDGE_PANEL]

When a student asks you to create a quiz or multiple-choice questions, use:

[KNOWLEDGE_PANEL]
{
  "name": "descriptive quiz name",
  "type": "test",
  "questions": [
    {
      "question": "question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0
    }
  ]
}
[/KNOWLEDGE_PANEL]

Rules:
- "correct" is the zero-based index of the correct answer
- Use 4 options for regular questions; use exactly 2 options ["True", "False"] for true/false questions
- Aim for 8–12 items in flashcard sets, 6–8 in quizzes
- You may write a brief intro sentence before the panel block and a closing line after it
- If the student pastes an existing panel for editing, output an improved version in the same format

Keep responses concise, warm, and encouraging. If you don't know something, say so honestly.`;

// ── Conversation history ──────────────────────────────────────

let conversationHistory = [];
let isStreaming = false;

// ── Render helpers ────────────────────────────────────────────

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderMarkdown(text) {
  if (!text) return '';
  let s = escHtml(text);

  // Bold, italic, inline code
  s = s.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([\s\S]*?)\*/g,     '<em>$1</em>');
  s = s.replace(/`([^`\n]+)`/g,        '<code>$1</code>');

  // Paragraphs
  const parts = s.split(/\n\n+/);
  return parts.map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
}

function cleanForDisplay(rawText) {
  // Remove complete panel blocks
  let s = rawText.replace(/\[KNOWLEDGE_PANEL\][\s\S]*?\[\/KNOWLEDGE_PANEL\]/g, '');
  // Remove any partial/in-progress panel block still streaming
  s = s.replace(/\[KNOWLEDGE_PANEL\][\s\S]*/g, '');
  return s.trim();
}

// ── Append / update messages ──────────────────────────────────

function appendMessage(role, text) {
  const msgsEl = document.getElementById('sbMessages');
  const msg    = document.createElement('div');
  msg.className = `msg msg--${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = role === 'ai' ? '✦' : 'You';

  const inner  = document.createElement('div');
  inner.className = 'msg-inner';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = renderMarkdown(text);

  inner.appendChild(bubble);
  msg.appendChild(avatar);
  msg.appendChild(inner);
  msgsEl.appendChild(msg);
  msgsEl.scrollTop = msgsEl.scrollHeight;
  return msg;
}

function updateBubble(msgEl, rawText, typing) {
  const bubble = msgEl.querySelector('.msg-bubble');
  const display = cleanForDisplay(rawText);
  bubble.innerHTML = renderMarkdown(display);
  if (typing) {
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    bubble.appendChild(cursor);
  }
  const msgsEl = document.getElementById('sbMessages');
  msgsEl.scrollTop = msgsEl.scrollHeight;
}

// ── Extract & save knowledge panels ──────────────────────────

async function extractAndSavePanels(fullText, msgEl) {
  const regex = /\[KNOWLEDGE_PANEL\]([\s\S]*?)\[\/KNOWLEDGE_PANEL\]/g;
  let match;
  while ((match = regex.exec(fullText)) !== null) {
    let panelData;
    try {
      panelData = JSON.parse(match[1].trim());
    } catch {
      continue;
    }

    const saved = await saveKnowledgePanel(panelData);
    const inner = msgEl.querySelector('.msg-inner');
    const badge = document.createElement('div');
    badge.className = 'msg-panel-saved';
    badge.textContent = saved
      ? `✓ "${panelData.name}" saved to Knowledge Finder`
      : `⚠ Could not save "${panelData.name}"`;
    inner.appendChild(badge);
  }

  // Refresh KF list if panel is open
  const kfPanel = document.getElementById('kfPanel');
  if (!kfPanel.hidden) renderKnowledgeFinder(document.getElementById('kfList'));
}

// ── Groq streaming request ────────────────────────────────────

async function sendToGroq(userText) {
  if (isStreaming) return;

  const trimmed = userText.trim();
  if (!trimmed) return;

  if (typeof GROQ_API_KEY === 'undefined' || GROQ_API_KEY === 'your-groq-api-key-here') {
    appendMessage('ai', '⚠ No Groq API key found. Please create a **config.js** file with your key — see **config.example.js** for the format.');
    return;
  }

  isStreaming = true;
  setSendDisabled(true);

  conversationHistory.push({ role: 'user', content: trimmed });
  appendMessage('user', trimmed);

  const aiMsgEl = appendMessage('ai', '');
  updateBubble(aiMsgEl, '', true);

  let fullResponse = '';

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model:      'llama-3.3-70b-versatile',
        messages:   [{ role: 'system', content: SYSTEM_PROMPT }, ...conversationHistory],
        stream:     true,
        max_tokens: 2048,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }

    const reader  = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          const json  = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content || '';
          fullResponse += delta;
          updateBubble(aiMsgEl, fullResponse, true);
        } catch { /* partial JSON chunk, skip */ }
      }
    }

    // Final render without cursor
    updateBubble(aiMsgEl, fullResponse, false);
    conversationHistory.push({ role: 'assistant', content: fullResponse });

    // Trim history to last 24 messages to respect token limits
    if (conversationHistory.length > 24) {
      conversationHistory = conversationHistory.slice(conversationHistory.length - 24);
    }

    await extractAndSavePanels(fullResponse, aiMsgEl);

  } catch (err) {
    updateBubble(aiMsgEl, `❌ Something went wrong: ${err.message}`, false);
  }

  isStreaming = false;
  setSendDisabled(false);
  document.getElementById('sbInput').focus();
}

// ── Input helpers ─────────────────────────────────────────────

function setSendDisabled(disabled) {
  document.getElementById('sbSend').disabled = disabled;
}

function autoResizeInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 140) + 'px';
}

// ── Input event handlers ──────────────────────────────────────

const inputEl = document.getElementById('sbInput');

inputEl.addEventListener('input', () => autoResizeInput(inputEl));

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

document.getElementById('sbSend').addEventListener('click', handleSend);

function handleSend() {
  const text = inputEl.value;
  if (!text.trim() || isStreaming) return;
  inputEl.value = '';
  inputEl.style.height = 'auto';
  sendToGroq(text);
}

// ── Welcome message ───────────────────────────────────────────

(function showWelcome() {
  const msgs = document.getElementById('sbMessages');
  const welcome = appendMessage('ai', '');
  welcome.querySelector('.msg-bubble').innerHTML = renderMarkdown(
    `Hey there! I'm your Study Buddy 👋\n\nI can help you **understand any topic**, **make flashcards**, or **quiz you** on your material. Just tell me what you're studying and I'll get to work.\n\nFor example, try:\n- *"Make 10 flashcards on the French Revolution"*\n- *"Quiz me on photosynthesis"*\n- *"Explain quantum entanglement simply"*`
  );
  msgs.scrollTop = 0;
})();
