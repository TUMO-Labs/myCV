'use strict';

// ── USER ID (persistent per browser) ─────────────────────────────────────────
var userId = localStorage.getItem('elen_uid');
if (!userId) {
  userId = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  localStorage.setItem('elen_uid', userId);
}
var visitorName = localStorage.getItem('elen_name') || '';

// ── CURSOR ────────────────────────────────────────────────────────────────────
(function () {
  var cur = document.getElementById('cursor');
  var dot = document.getElementById('cursorDot');
  if (!cur) return;
  var mx = -200, my = -200, cx = -200, cy = -200;
  document.addEventListener('mousemove', function (e) {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px'; dot.style.top = my + 'px';
  });
  (function loop() {
    cx += (mx - cx) * 0.12; cy += (my - cy) * 0.12;
    cur.style.left = cx + 'px'; cur.style.top = cy + 'px';
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll('a,button,.proj-card,.sk-card,.tl-card,.exp-card,.cc').forEach(function (el) {
    el.addEventListener('mouseenter', function () { cur.classList.add('hovered'); });
    el.addEventListener('mouseleave', function () { cur.classList.remove('hovered'); });
  });
})();

// ── NAV SCROLL ────────────────────────────────────────────────────────────────
(function () {
  var nav = document.getElementById('nav');
  if (!nav) return;
  window.addEventListener('scroll', function () {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
})();

// ── MOBILE MENU ───────────────────────────────────────────────────────────────
(function () {
  var btn = document.getElementById('burger');
  var menu = document.getElementById('mobileMenu');
  if (!btn || !menu) return;
  btn.addEventListener('click', function () { menu.classList.toggle('open'); });
  menu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { menu.classList.remove('open'); });
  });
})();

// ── REVEAL ON SCROLL ──────────────────────────────────────────────────────────
(function () {
  var items = document.querySelectorAll('.reveal');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry, _i) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var par = el.parentElement;
      var siblings = par ? Array.from(par.querySelectorAll('.reveal:not(.visible)')) : [];
      var idx = siblings.indexOf(el);
      setTimeout(function () { el.classList.add('visible'); }, Math.min(idx, 4) * 80);
      io.unobserve(el);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
  items.forEach(function (el) { io.observe(el); });
})();

// ── LANGUAGE BARS ─────────────────────────────────────────────────────────────
(function () {
  var fills = document.querySelectorAll('.lb-fill');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        setTimeout(function () { e.target.classList.add('animated'); }, 200);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  fills.forEach(function (f) { io.observe(f); });
})();

// ── TERMINAL ANIMATION ────────────────────────────────────────────────────────
(function () {
  var outs = document.querySelectorAll('.term-out.to-anim');
  var io = new IntersectionObserver(function (entries) {
    if (!entries[0].isIntersecting) return;
    outs.forEach(function (out, i) {
      setTimeout(function () { out.classList.add('visible'); }, i * 320);
    });
    io.disconnect();
  }, { threshold: 0.4 });
  var tb = document.getElementById('termBody');
  if (tb) io.observe(tb);
})();

// ── SMOOTH SCROLL ─────────────────────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    var t = document.querySelector(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// ── STAGGER DELAYS ────────────────────────────────────────────────────────────
['.proj-grid .proj-card', '.exp-grid .exp-card', '.skills-grid .sk-card', '.contact-row .cc'].forEach(function (sel) {
  document.querySelectorAll(sel).forEach(function (el, i) {
    el.style.transitionDelay = (i * 0.06) + 's';
  });
});

// ── ACTIVE NAV ────────────────────────────────────────────────────────────────
(function () {
  var sections = document.querySelectorAll('section[id]');
  var links = document.querySelectorAll('.nav-links a[href^="#"]');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        links.forEach(function (l) {
          l.style.color = '';
          if (l.getAttribute('href') === '#' + entry.target.id) l.style.color = 'var(--gold)';
        });
      }
    });
  }, { threshold: 0.45 });
  sections.forEach(function (s) { io.observe(s); });
})();

// ══════════════════════════════════════════════════════════════════════════════
// CHAT WIDGET
// ══════════════════════════════════════════════════════════════════════════════
var chatFab      = document.getElementById('chatFab');
var chatWidget   = document.getElementById('chatWidget');
var cwMessages   = document.getElementById('cwMessages');
var cwInput      = document.getElementById('cwInput');
var cwSend       = document.getElementById('cwSend');
var cwMic        = document.getElementById('cwMic');
var voiceBar     = document.getElementById('voiceBar');
var cwStatus     = document.getElementById('cwStatus');
var fabBadge     = document.getElementById('fabBadge');
var cwClose      = document.getElementById('cwClose');
var cwInputArea  = document.getElementById('cwInputArea');
var cwNamePrompt = document.getElementById('cwNamePrompt');
var cwNameInput  = document.getElementById('cwNameInput');
var cwNameSubmit = document.getElementById('cwNameSubmit');

var isOpen      = false;
var isSending   = false;
var pollTimer   = null;
var notifCount  = 0;
var recognition = null;
var isRecording = false;

function timeNow() {
  var d = new Date();
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

// ── Open/close ────────────────────────────────────────────────────────────────
function toggleChat() {
  isOpen = !isOpen;
  chatWidget.classList.toggle('open', isOpen);
  chatFab.classList.toggle('open', isOpen);
  if (isOpen) {
    notifCount = 0;
    fabBadge.classList.remove('show');
    fabBadge.textContent = '';
    // If name already saved, skip prompt
    if (visitorName) {
      showChatUI();
    } else {
      setTimeout(function () { if (cwNameInput) cwNameInput.focus(); }, 300);
    }
  }
}
chatFab.addEventListener('click', toggleChat);
cwClose.addEventListener('click', toggleChat);

// ── Name submission ───────────────────────────────────────────────────────────
function showChatUI() {
  if (cwNamePrompt) cwNamePrompt.style.display = 'none';
  if (cwMessages)   cwMessages.style.display   = 'flex';
  if (cwInputArea)  cwInputArea.style.display  = 'block';
  scrollBottom();
  setTimeout(function () { if (cwInput) cwInput.focus(); }, 100);
  if (!pollTimer) startPolling();
}

if (cwNameSubmit) {
  cwNameSubmit.addEventListener('click', submitName);
}
if (cwNameInput) {
  cwNameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') submitName();
  });
}

function submitName() {
  var name = (cwNameInput ? cwNameInput.value.trim() : '') || 'Visitor';
  visitorName = name;
  localStorage.setItem('elen_name', name);
  showChatUI();
  // Send a system greeting message to create the Telegram thread immediately
  sendToTelegram('[' + name + ' started a conversation]', true);
}

// If name is already set, show chat UI immediately when widget opens
if (visitorName && cwNamePrompt) {
  cwNamePrompt.style.display = 'none';
  if (cwMessages)  cwMessages.style.display  = 'flex';
  if (cwInputArea) cwInputArea.style.display = 'block';
}

// ── Add message bubble ────────────────────────────────────────────────────────
function addMsg(role, text, isElen) {
  var wrap = document.createElement('div');
  wrap.className = 'cw-msg ' + (isElen ? 'elen' : role);

  if (isElen) {
    var label = document.createElement('div');
    label.className = 'elen-label';
    label.textContent = 'Elen';
    wrap.appendChild(label);
  }

  var bubble = document.createElement('div');
  bubble.className = 'cw-bubble';
  bubble.style.whiteSpace = 'pre-wrap';
  bubble.textContent = text;
  wrap.appendChild(bubble);

  var t = document.createElement('div');
  t.className = 'cw-time';
  t.textContent = timeNow();
  wrap.appendChild(t);

  cwMessages.appendChild(wrap);
  scrollBottom();
}

function scrollBottom() {
  requestAnimationFrame(function () {
    if (cwMessages) cwMessages.scrollTop = cwMessages.scrollHeight;
  });
}

// ── Sending ───────────────────────────────────────────────────────────────────
cwInput.addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 100) + 'px';
});
cwInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
});
cwSend.addEventListener('click', doSend);

function doSend() {
  var text = cwInput.value.trim();
  if (!text || isSending) return;

  addMsg('user', text);
  cwInput.value = '';
  cwInput.style.height = 'auto';

  sendToTelegram(text, false);
}

function sendToTelegram(text, silent) {
  if (isSending && !silent) return;
  if (!silent) isSending = true;
  if (!silent) cwSend.disabled = true;

  fetch('/api/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userId, name: visitorName, text: text, silent: !!silent })
  })
  .then(function (r) { return r.json(); })
  .then(function (data) {
    if (!silent) {
      isSending = false;
      cwSend.disabled = false;
      if (data.error) {
        addMsg('bot', 'Message could not be delivered. Please try again.');
      }
    }
  })
  .catch(function () {
    if (!silent) {
      isSending = false;
      cwSend.disabled = false;
      addMsg('bot', 'Connection error. Please try again.');
    }
  });
}

// ── Poll for Elen's replies ───────────────────────────────────────────────────
function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(pollReply, 3000);
}

function pollReply() {
  fetch('/api/poll?userId=' + encodeURIComponent(userId))
  .then(function (r) { return r.json(); })
  .then(function (data) {
    if (data.type === 'reply' && data.text) {
      // Skip system messages that the bot echoes back
      if (data.text.indexOf('[') === 0 && data.text.indexOf('started a conversation') !== -1) return;

      addMsg('elen', data.text, true);
      cwStatus.textContent = 'Elen replied';
      setTimeout(function () { cwStatus.textContent = 'Usually replies within a few hours'; }, 5000);

      if (!isOpen) {
        notifCount++;
        fabBadge.textContent = notifCount;
        fabBadge.classList.add('show');
      }
    }
  })
  .catch(function () {});
}

// Always poll even when widget is closed so notifications work
startPolling();

// ── Voice Input ───────────────────────────────────────────────────────────────
(function () {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    cwMic.style.opacity = '0.3';
    cwMic.title = 'Voice not supported. Use Chrome.';
    return;
  }

  recognition = new SR();
  recognition.continuous     = true;
  recognition.interimResults = true;
  recognition.lang           = 'en-US';

  recognition.onresult = function (event) {
    var transcript = '';
    for (var i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    cwInput.value = transcript;
    cwInput.style.height = 'auto';
    cwInput.style.height = Math.min(cwInput.scrollHeight, 100) + 'px';
  };

  recognition.onerror = function (e) {
    stopRecording();
    if (e.error === 'not-allowed') {
      addMsg('bot', 'Microphone access denied. Allow it in browser settings.');
    }
  };

  // Restart if it ends while still recording (browser silence timeout)
  recognition.onend = function () {
    if (isRecording) {
      try { recognition.start(); } catch (ex) { stopRecording(); }
    }
  };

  cwMic.addEventListener('click', function () {
    if (isRecording) {
      stopRecording();
      setTimeout(function () { if (cwInput.value.trim()) doSend(); }, 150);
    } else {
      startRecording();
    }
  });

  function startRecording() {
    cwInput.value = '';
    try {
      recognition.start();
      isRecording = true;
      cwMic.classList.add('recording');
      voiceBar.classList.add('active');
      cwStatus.textContent = 'Recording — click mic to stop';
    } catch (e) {}
  }

  function stopRecording() {
    isRecording = false;
    cwMic.classList.remove('recording');
    voiceBar.classList.remove('active');
    cwStatus.textContent = 'Usually replies within a few hours';
    try { recognition.stop(); } catch (e) {}
  }
})();
