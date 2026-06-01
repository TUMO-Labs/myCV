require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

let TelegramBot;
try { TelegramBot = require('node-telegram-bot-api'); } catch(e) {}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const GROUP_ID  = process.env.TELEGRAM_GROUP_ID  || '';

// ─── STORES ───────────────────────────────────────────────────────────────────
// userId -> { name, pendingReplies:[], msgIds:[] }
const users = {};
// Telegram message_id -> userId  (for reply-to mapping)
const msgToUser = {};
// Flag: does the group support forum topics?
let groupHasTopics = null; // null = not checked yet

// ─── BOT ──────────────────────────────────────────────────────────────────────
let bot = null;

if (TelegramBot && BOT_TOKEN && BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
  bot = new TelegramBot(BOT_TOKEN, { polling: { interval: 1000, autoStart: true } });

  // Listen for messages from the group
  bot.on('message', (msg) => {
    const chatId = String(msg.chat.id);
    if (chatId !== String(GROUP_ID)) return;
    if (msg.from && msg.from.is_bot) return; // ignore bot's own messages

    const text = msg.text;
    if (!text) return;

    // ── MODE 1: Forum topics — reply inside a specific thread ──────────────
    if (msg.message_thread_id) {
      // Find user by which message in that thread this is replying to
      // We track by: any message in thread belongs to the user who owns that thread
      // threadId is stored per-user
      for (var uid in users) {
        if (users[uid].threadId && String(users[uid].threadId) === String(msg.message_thread_id)) {
          users[uid].pendingReplies.push({ text: text, ts: Date.now() });
          console.log('Forum reply to user', uid, ':', text);
          return;
        }
      }
      return;
    }

    // ── MODE 2: Regular group — Elen replies to a forwarded message ────────
    const replyTo = msg.reply_to_message;
    if (replyTo) {
      const origId = String(replyTo.message_id);
      const userId = msgToUser[origId];
      if (userId && users[userId]) {
        users[userId].pendingReplies.push({ text: text, ts: Date.now() });
        console.log('Reply-to reply to user', userId, ':', text);
        delete msgToUser[origId];
        return;
      }
    }

    // ── MODE 3: Elen writes "reply <userId_prefix> <message>" ─────────────
    // e.g.  reply u_168  Hello there!
    const match = text.match(/^reply\s+(\S+)\s+(.+)$/i);
    if (match) {
      const prefix = match[1].toLowerCase();
      const reply  = match[2];
      for (var uid in users) {
        if (uid.toLowerCase().startsWith(prefix)) {
          users[uid].pendingReplies.push({ text: reply, ts: Date.now() });
          console.log('Manual reply to user', uid, ':', reply);
          bot.sendMessage(GROUP_ID, 'Delivered to ' + users[uid].name + ' (' + uid.slice(0,10) + ')');
          return;
        }
      }
      bot.sendMessage(GROUP_ID, 'User "' + prefix + '" not found.');
      return;
    }

    // Show help if Elen sends something unrecognised
    bot.sendMessage(GROUP_ID,
      'To reply to a visitor, either:\n' +
      '1. Reply to their forwarded message\n' +
      '2. Write:  reply <userId> <your message>\n\n' +
      'Active visitors:\n' + listUsers()
    );
  });

  bot.on('polling_error', (err) => {
    console.error('Polling error:', err.code || err.message);
  });

  console.log('Telegram bot started');
} else {
  console.warn('No TELEGRAM_BOT_TOKEN — Telegram disabled');
}

function listUsers() {
  var keys = Object.keys(users);
  if (!keys.length) return '(none yet)';
  return keys.map(function(uid) {
    return '• ' + users[uid].name + ' — ID: ' + uid.slice(0, 12);
  }).join('\n');
}

// ─── Try to detect if group has forum topics ──────────────────────────────────
async function detectGroupMode() {
  if (!bot || !GROUP_ID) return;
  try {
    const chat = await bot.getChat(GROUP_ID);
    groupHasTopics = !!chat.is_forum;
    console.log('Group mode:', groupHasTopics ? 'FORUM (topics)' : 'REGULAR');
    console.log('Group title:', chat.title || '(unknown)');
  } catch (e) {
    console.warn('Could not get chat info:', e.message);
    groupHasTopics = false;
  }
}
detectGroupMode();

// ─── Create forum topic for a user ───────────────────────────────────────────
async function createUserThread(userId, name) {
  if (!bot || !GROUP_ID) return null;
  try {
    const res = await bot.createForumTopic(GROUP_ID, name + ' — visitor');
    const threadId = res.message_thread_id;
    users[userId].threadId = threadId;

    await bot.sendMessage(GROUP_ID,
      'Visitor: ' + name + '\nID: ' + userId.slice(0, 14) + '\n\nReply in this thread to respond.',
      { message_thread_id: threadId }
    );
    console.log('Created forum topic', threadId, 'for', name);
    return threadId;
  } catch (e) {
    console.error('createForumTopic failed:', e.message);
    // Fall back to regular group mode
    groupHasTopics = false;
    return null;
  }
}

// ─── Forward message in regular group mode ───────────────────────────────────
async function forwardInRegularGroup(userId, name, text) {
  if (!bot || !GROUP_ID) return false;
  try {
    const msgText = '[' + name + ' / ' + userId.slice(0,8) + ']\n' + text;
    const sent = await bot.sendMessage(GROUP_ID, msgText);
    msgToUser[String(sent.message_id)] = userId;
    return true;
  } catch (e) {
    console.error('sendMessage error:', e.message);
    return false;
  }
}

// ─── POST /api/message ────────────────────────────────────────────────────────
app.post('/api/message', async (req, res) => {
  const { userId, name, text, silent } = req.body;
  if (!userId || !text) return res.status(400).json({ error: 'userId and text required' });

  const displayName = (name || 'Visitor').trim() || 'Visitor';

  // Ensure user record
  if (!users[userId]) {
    users[userId] = { name: displayName, threadId: null, pendingReplies: [] };
  } else {
    users[userId].name = displayName;
  }

  // If silent (system ping to create thread), skip sending the text itself
  if (silent) {
    // Just create the thread / register user
    if (bot && GROUP_ID) {
      if (groupHasTopics === null) await detectGroupMode();
      if (groupHasTopics) {
        if (!users[userId].threadId) await createUserThread(userId, displayName);
      } else {
        // Send one-time intro message
        if (!users[userId].introduced) {
          users[userId].introduced = true;
          const msg = 'New visitor: ' + displayName + ' (' + userId.slice(0,10) + ')\nTo reply: reply ' + userId.slice(0,10) + ' your message here';
          try { await bot.sendMessage(GROUP_ID, msg); } catch(e) { console.error(e.message); }
        }
      }
    }
    return res.json({ ok: true });
  }

  if (!bot || !GROUP_ID) {
    return res.json({ ok: true, note: 'Bot not configured' });
  }

  // Wait for group mode detection if still pending
  if (groupHasTopics === null) await detectGroupMode();

  try {
    if (groupHasTopics) {
      // Forum topic mode
      if (!users[userId].threadId) {
        await createUserThread(userId, displayName);
      }
      if (users[userId].threadId) {
        await bot.sendMessage(GROUP_ID, text, {
          message_thread_id: users[userId].threadId
        });
        return res.json({ ok: true });
      }
      // fallback if topic creation failed
    }

    // Regular group mode (or forum fallback)
    const ok = await forwardInRegularGroup(userId, displayName, text);
    if (ok) return res.json({ ok: true });
    return res.status(500).json({ error: 'Could not send to Telegram' });

  } catch (e) {
    console.error('/api/message error:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/poll ────────────────────────────────────────────────────────────
app.get('/api/poll', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const user = users[userId];
  if (user && user.pendingReplies && user.pendingReplies.length > 0) {
    const reply = user.pendingReplies.shift();
    return res.json({ type: 'reply', text: reply.text });
  }
  res.json({ type: 'none' });
});

// ─── GET /api/users (debug) ───────────────────────────────────────────────────
app.get('/api/users', (req, res) => {
  const summary = {};
  for (var uid in users) {
    summary[uid] = { name: users[uid].name, threadId: users[uid].threadId || 'none', pendingReplies: users[uid].pendingReplies.length };
  }
  res.json({ groupMode: groupHasTopics ? 'forum' : 'regular', users: summary });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Running at http://localhost:' + PORT);
  console.log('Bot: ' + (bot ? 'ACTIVE' : 'DISABLED'));
  console.log('Group ID: ' + (GROUP_ID || 'NOT SET'));
});
