/* ══════════════════════════════════════════════
   ELEN YEGHIAZARYAN — PORTFOLIO MAIN.JS
   Bugs fixed:
   ✔ Dynamic copyright year
   ✔ Reveal animation (no flash)
   ✔ Progress bars animate on scroll
   ✔ Mobile nav closes on link click
   ✔ Full two-way Telegram chat widget
══════════════════════════════════════════════ */

// ─────────────────────────────────────────────
// Year
// ─────────────────────────────────────────────
document.getElementById('year').textContent = new Date().getFullYear();

// ─────────────────────────────────────────────
// Nav scroll effect
// ─────────────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ─────────────────────────────────────────────
// Mobile menu
// ─────────────────────────────────────────────
const menuBtn   = document.getElementById('menuBtn');
const navLinks  = document.querySelector('.nav-links');

menuBtn?.addEventListener('click', () => navLinks.classList.toggle('active'));

navLinks?.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => navLinks.classList.remove('active'))
);

// ─────────────────────────────────────────────
// Smooth scrolling
// ─────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
        const target = document.querySelector(a.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
    });
});

// ─────────────────────────────────────────────
// Reveal on scroll (FIX: set opacity:0 in CSS, not after intersect)
// ─────────────────────────────────────────────
const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            e.target.classList.add('visible');
            revealObserver.unobserve(e.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ─────────────────────────────────────────────
// Progress bars (language section)
// ─────────────────────────────────────────────
const progressObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (e.isIntersecting) {
            e.target.querySelectorAll('.progress[data-width]').forEach(bar => {
                bar.style.width = bar.dataset.width + '%';
            });
            progressObserver.unobserve(e.target);
        }
    });
}, { threshold: 0.3 });

const langSection = document.querySelector('.languages');
if (langSection) progressObserver.observe(langSection);

// ─────────────────────────────────────────────
// ── CHAT WIDGET ──────────────────────────────
// ─────────────────────────────────────────────

const chatButton = document.getElementById('chatButton');
const chatWindow = document.getElementById('chatWindow');
const chatClose  = document.getElementById('chatClose');
const chatBody   = document.getElementById('chatBody');
const chatFooter = document.getElementById('chatFooter');

let chatOpen = false;

function toggleChat() {
    chatOpen = !chatOpen;
    chatWindow.classList.toggle('open', chatOpen);
    if (chatOpen && chatBody.childElementCount === 0) initChat();
}

chatButton?.addEventListener('click', toggleChat);
chatClose?.addEventListener('click', () => {
    chatOpen = false;
    chatWindow.classList.remove('open');
});

// ── State ──────────────────────────────────
let userName      = '';
let sessionId     = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
let lastUpdateId  = 0;
let pollTimer     = null;
let waitingReply  = false;
let lastMsgId     = null;

// ── DOM helpers ────────────────────────────
function addMsg(text, type = 'bot') {
    const d = document.createElement('div');
    d.className = `chat-msg ${type}`;
    d.textContent = text;
    chatBody.appendChild(d);
    scrollBottom();
    return d;
}

function addTyping() {
    const d = document.createElement('div');
    d.className = 'chat-msg bot';
    d.id = 'typingIndicator';
    d.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    chatBody.appendChild(d);
    scrollBottom();
}

function removeTyping() {
    document.getElementById('typingIndicator')?.remove();
}

function scrollBottom() {
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: 'smooth' });
}

function clearFooter() {
    chatFooter.innerHTML = '';
}

function addOptions(opts, callback) {
    const row = document.createElement('div');
    row.className = 'chat-options-row';
    opts.forEach(({ label, value }) => {
        const btn = document.createElement('button');
        btn.className = 'chat-opt';
        btn.textContent = label;
        btn.addEventListener('click', () => {
            // disable all opts
            row.querySelectorAll('.chat-opt').forEach(b => b.disabled = true);
            addMsg(label, 'user');
            callback(value);
        });
        row.appendChild(btn);
    });
    chatBody.appendChild(row);
    scrollBottom();
}

function showNameInput() {
    clearFooter();
    const row = document.createElement('div');
    row.className = 'chat-input-row';
    const inp = document.createElement('input');
    inp.type        = 'text';
    inp.placeholder = 'Your name…';
    inp.className   = 'chat-input';
    inp.maxLength   = 60;
    const btn = document.createElement('button');
    btn.className   = 'chat-send-btn';
    btn.textContent = '→';

    const submit = () => {
        const val = inp.value.trim();
        if (!val) { inp.focus(); return; }
        clearFooter();
        addMsg(val, 'user');
        userName = val;
        showTopicMenu();
    };

    btn.addEventListener('click', submit);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });

    row.appendChild(inp);
    row.appendChild(btn);
    chatFooter.appendChild(row);
    setTimeout(() => inp.focus(), 50);
}

function showMessageInput(onSend) {
    clearFooter();
    const ta  = document.createElement('textarea');
    ta.className   = 'chat-textarea';
    ta.placeholder = 'Type your message…';
    ta.maxLength   = 1000;
    chatFooter.appendChild(ta);

    const row = document.createElement('div');
    row.className   = 'chat-input-row';
    const btn = document.createElement('button');
    btn.className   = 'chat-send-btn';
    btn.textContent = 'Send 📨';

    const submit = () => {
        const val = ta.value.trim();
        if (!val) { ta.focus(); return; }
        clearFooter();
        addMsg(val, 'user');
        onSend(val);
    };

    btn.addEventListener('click', submit);
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } });
    row.appendChild(btn);
    chatFooter.appendChild(row);
    setTimeout(() => ta.focus(), 50);
}

// ── Chat flow ──────────────────────────────
function initChat() {
    addMsg('Hi there! 👋 I\'m Elen. What\'s your name?');
    showNameInput();
}

function showTopicMenu() {
    addMsg(`Nice to meet you, ${userName}! 👋 What would you like to know about?`);
    addOptions([
        { label: '📖 About Elen',   value: 'about'      },
        { label: '🎓 Education',    value: 'education'  },
        { label: '💼 Experience',   value: 'experience' },
        { label: '🚀 Projects',     value: 'projects'   },
        { label: '⚙️ Skills',       value: 'skills'     },
        { label: '💬 Send a message', value: 'message'  },
    ], handleTopic);
}

const topicReplies = {
    about:      "I'm a CS & Applied Mathematics student passionate about tech, IoT, and data science. I love building things that solve real problems! 🚀",
    education:  "I study at the French University of Armenia and Université Paul Sabatier Toulouse III. I'm also taking Semiconductor Engineering at Synopsys! 📚",
    experience: "I work as an ESL Teacher at Academy Polyglot, helping students improve their English from A1 all the way to C1. I love teaching! 💪",
    projects:   "Check out my projects on GitHub! I've built IoT systems with ESP32, ML models in Python, and this portfolio with live Telegram chat. 🔗",
    skills:     "I work with Python, C, Java, Flask, Git, IoT, SQL, and more. Always learning new technologies! ⚡",
};

async function handleTopic(topic) {
    if (topic === 'message') {
        addMsg('Of course! Write your message and I\'ll get back to you as soon as possible 😊');
        showMessageInput(sendUserMessage);
        return;
    }

    addTyping();
    await delay(900);
    removeTyping();
    addMsg(topicReplies[topic] || 'Thanks for your interest!');

    addOptions([
        { label: '💬 Send Elen a message', value: 'message' },
        { label: '🔚 End conversation',    value: 'end'     },
    ], opt => {
        if (opt === 'message') {
            addMsg('Sure! What would you like to tell me?');
            showMessageInput(sendUserMessage);
        } else {
            endChat();
        }
    });
}

async function sendUserMessage(message) {
    waitingReply = true;
    addTyping();

    try {
        const res = await fetch('/send-message', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ name: userName, message, session_id: sessionId }),
        });

        if (!res.ok) throw new Error('Server error');
        const data = await res.json();
        lastMsgId = data.message_id;

        removeTyping();
        addMsg('✅ Message sent! I\'ll reply here as soon as I can.');
        document.getElementById('chatStatus').innerHTML = '<span class="status-dot"></span> Waiting for reply…';
        startPolling();

    } catch {
        removeTyping();
        addMsg('⚠️ Couldn\'t send the message. Please try emailing me directly!');
        clearFooter();
    }
}

function endChat() {
    addMsg(`Thanks for stopping by, ${userName}! Feel free to come back anytime. 👋`);
    clearFooter();
    setTimeout(() => {
        chatOpen = false;
        chatWindow.classList.remove('open');
    }, 2500);
}

// ── Polling for Elen's reply ───────────────
function startPolling() {
    if (pollTimer) return;
    poll();
}

async function poll() {
    if (!waitingReply) return;

    try {
        const url = `/poll-reply?session_id=${sessionId}&after_update_id=${lastUpdateId}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.status === 'reply') {
            waitingReply = false;
            lastUpdateId = data.update_id;

            document.getElementById('chatStatus').innerHTML = '<span class="status-dot"></span> Usually replies quickly';
            addMsg(`Elen: ${data.text}`, 'elen');

            addOptions([
                { label: '💬 Reply back',     value: 'reply' },
                { label: '🔚 End conversation', value: 'end' },
            ], opt => {
                if (opt === 'reply') {
                    showMessageInput(sendUserMessage);
                } else {
                    endChat();
                }
            });
            return; // stop polling
        }

        if (data.update_id) lastUpdateId = data.update_id;
    } catch { /* network hiccup, retry */ }

    // retry every 6 seconds while waiting
    pollTimer = setTimeout(() => { pollTimer = null; poll(); }, 6000);
}

// ── Utility ────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
