'use strict';

// USER ID 
var userId = localStorage.getItem('elen_uid');
if (!userId) {
  userId = 'u_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  localStorage.setItem('elen_uid', userId);
}
var visitorName = localStorage.getItem('elen_name') || '';
var ttsEnabled = localStorage.getItem('tts_enabled') !== 'false';

// CURSOR 
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

// NAV SCROLL 
(function () {
  var nav = document.getElementById('nav');
  if (!nav) return;
  window.addEventListener('scroll', function () {
    nav.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
})();

//  MOBILE MENU 
(function () {
  var btn = document.getElementById('burger');
  var menu = document.getElementById('mobileMenu');
  if (!btn || !menu) return;
  btn.addEventListener('click', function () { menu.classList.toggle('open'); });
  menu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { menu.classList.remove('open'); });
  });
})();

//  REVEAL ON SCROLL 
(function () {
  var items = document.querySelectorAll('.reveal');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      var siblings = Array.from(el.parentElement ? el.parentElement.querySelectorAll('.reveal:not(.visible)') : []);
      var idx = siblings.indexOf(el);
      setTimeout(function () { el.classList.add('visible'); }, Math.min(idx, 4) * 80);
      io.unobserve(el);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });
  items.forEach(function (el) { io.observe(el); });
})();

//  LANGUAGE BARS 
(function () {
  var fills = document.querySelectorAll('.lb-fill');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { setTimeout(function () { e.target.classList.add('animated'); }, 200); io.unobserve(e.target); }
    });
  }, { threshold: 0.5 });
  fills.forEach(function (f) { io.observe(f); });
})();

//  TERMINAL ANIMATION 
(function () {
  var outs = document.querySelectorAll('.term-out.to-anim');
  var io = new IntersectionObserver(function (entries) {
    if (!entries[0].isIntersecting) return;
    outs.forEach(function (out, i) { setTimeout(function () { out.classList.add('visible'); }, i * 320); });
    io.disconnect();
  }, { threshold: 0.4 });
  var tb = document.getElementById('termBody');
  if (tb) io.observe(tb);
})();

// SMOOTH SCROLL 
document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    var t = document.querySelector(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

//  STAGGER DELAYS 
['.proj-grid .proj-card', '.exp-grid .exp-card', '.skills-grid .sk-card', '.contact-row .cc'].forEach(function (sel) {
  document.querySelectorAll(sel).forEach(function (el, i) { el.style.transitionDelay = (i * 0.06) + 's'; });
});

// ACTIVE NAV 
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

// PERSISTENCE FUNCTIONS (save/load messages to localStorage)
function saveMessages(containerId, messages) {
  localStorage.setItem(`chat_${userId}_${containerId}`, JSON.stringify(messages));
}

function loadMessages(containerId) {
  var saved = localStorage.getItem(`chat_${userId}_${containerId}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch(e) { return []; }
  }
  return [];
}

function addMsgWithPersistence(container, role, text, labelText) {
  var wrap = document.createElement('div');
  wrap.className = 'cw-msg ' + role;
  if (labelText) {
    var lbl = document.createElement('div');
    lbl.className = 'elen-label';
    lbl.textContent = labelText;
    wrap.appendChild(lbl);
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
  container.appendChild(wrap);
  scrollBottom(container);
  
  var containerId = container.id;
  if (containerId) {
    var messages = loadMessages(containerId);
    messages.push({ role, text, label: labelText || null, time: timeNow() });
    if (messages.length > 100) messages = messages.slice(-100);
    saveMessages(containerId, messages);
  }
}

function restoreMessages(containerId, containerElement) {
  var messages = loadMessages(containerId);
  messages.forEach(function(msg) {
    var wrap = document.createElement('div');
    wrap.className = 'cw-msg ' + msg.role;
    if (msg.label) {
      var lbl = document.createElement('div');
      lbl.className = 'elen-label';
      lbl.textContent = msg.label;
      wrap.appendChild(lbl);
    }
    var bubble = document.createElement('div');
    bubble.className = 'cw-bubble';
    bubble.style.whiteSpace = 'pre-wrap';
    bubble.textContent = msg.text;
    wrap.appendChild(bubble);
    var t = document.createElement('div');
    t.className = 'cw-time';
    t.textContent = msg.time;
    wrap.appendChild(t);
    containerElement.appendChild(wrap);
  });
  scrollBottom(containerElement);
}

// Override global addMsgTo
window.addMsgTo = addMsgWithPersistence;

// HELPER FUNCTIONS 
function timeNow() {
  var d = new Date();
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}
function scrollBottom(el) {
  requestAnimationFrame(function () { if (el) el.scrollTop = el.scrollHeight; });
}
function showTyping(container, id) {
  var wrap = document.createElement('div');
  wrap.className = 'cw-msg bot typing-indicator';
  wrap.id = id;
  wrap.innerHTML = '<div class="cw-bubble"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div>';
  container.appendChild(wrap);
  scrollBottom(container);
}
function removeTyping(id) {
  var el = document.getElementById(id);
  if (el) el.remove();
}

// SOCKETIO CONNECTION 
var socket = io();
socket.on('connect', function() { console.log('SocketIO connected'); });
socket.on('ai_response', function(data) {
  removeTyping('aiTyping');
  addMsgWithPersistence(aiMessages, 'bot', data.answer);
  aiStatus.textContent = 'Ask me anything about Elen';
  aiSending = false;
  aiSend.disabled = false;
  if (ttsEnabled && data.answer && !data.answer.includes('Nice to meet you')) {
    speakText(data.answer);
  }
});
socket.on('ai_error', function(data) {
  removeTyping('aiTyping');
  addMsgWithPersistence(aiMessages, 'bot', data.error || 'Something went wrong.');
  aiSending = false;
  aiSend.disabled = false;
});

//  TTS (TEXT‑TO‑SPEECH) 
function speakText(text) {
  if (!window.speechSynthesis) return;
  var utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

// CHAT UI ELEMENTS 
var chatFab = document.getElementById('chatFab');
var modePicker = document.getElementById('modePicker');
var aiWidget = document.getElementById('aiWidget');
var humanWidget = document.getElementById('humanWidget');
var fabBadge = document.getElementById('fabBadge');
var mpClose = document.getElementById('mpClose');
var chooseAI = document.getElementById('chooseAI');
var chooseHuman = document.getElementById('chooseHuman');
var chatMode = null;
var notifCount = 0;

// Add TTS mute button to AI header
var aiHeader = document.querySelector('#aiWidget .cw-header');
if (aiHeader) {
  var muteBtn = document.createElement('button');
  muteBtn.className = 'cw-mute';
  muteBtn.innerHTML = ttsEnabled ? '🔊' : '🔇';
  muteBtn.title = 'Toggle voice reading';
  muteBtn.style.background = 'none';
  muteBtn.style.border = 'none';
  muteBtn.style.cursor = 'pointer';
  muteBtn.style.fontSize = '1.2rem';
  muteBtn.style.marginLeft = 'auto';
  muteBtn.style.marginRight = '8px';
  muteBtn.onclick = function() {
    ttsEnabled = !ttsEnabled;
    localStorage.setItem('tts_enabled', ttsEnabled);
    muteBtn.innerHTML = ttsEnabled ? '🔊' : '🔇';
    if (!ttsEnabled) stopSpeaking();
  };
  var aiCloseBtn = document.querySelector('#aiWidget .cw-close');
  if (aiCloseBtn) aiHeader.insertBefore(muteBtn, aiCloseBtn);
}

function closeAll() {
  modePicker.classList.remove('open');
  if (aiWidget) aiWidget.classList.remove('open');
  if (humanWidget) humanWidget.classList.remove('open');
  chatFab.classList.remove('open');
  chatMode = null;
}
function openPicker() {
  closeAll();
  modePicker.classList.add('open');
  chatFab.classList.add('open');
  chatMode = 'picker';
}
function openAI() {
  modePicker.classList.remove('open');
  if (humanWidget) humanWidget.classList.remove('open');
  aiWidget.classList.add('open');
  chatFab.classList.add('open');
  chatMode = 'ai';
  aiMessages.innerHTML = '';
  var saved = loadMessages('aiMessages');
  if (saved.length === 0) {
    addMsgWithPersistence(aiMessages, 'bot', "Hello! I'm Elen's AI assistant. What's your name?");
  } else {
    restoreMessages('aiMessages', aiMessages);
  }
  aiStatus.textContent = 'Ask me anything about Elen';
  setTimeout(function() { if (aiInput) aiInput.focus(); }, 300);
  scrollBottom(aiMessages);
}
function openHuman() {
  modePicker.classList.remove('open');
  if (aiWidget) aiWidget.classList.remove('open');
  humanWidget.classList.add('open');
  chatFab.classList.add('open');
  chatMode = 'human';
  notifCount = 0;
  fabBadge.classList.remove('show');
  fabBadge.textContent = '';
  if (visitorName) {
    if (cwMessages && loadMessages('cwMessages').length > 0) {
      cwMessages.innerHTML = '';
      restoreMessages('cwMessages', cwMessages);
    }
    showHumanChatUI();
  } else {
    setTimeout(function () { if (cwNameInput) cwNameInput.focus(); }, 300);
  }
}
chatFab.addEventListener('click', function () {
  if (chatMode) { closeAll(); } else { openPicker(); }
});
mpClose.addEventListener('click', closeAll);
chooseAI.addEventListener('click', openAI);
chooseHuman.addEventListener('click', openHuman);
document.getElementById('aiBack')?.addEventListener('click', openPicker);
document.getElementById('humanBack')?.addEventListener('click', openPicker);
document.getElementById('aiClose')?.addEventListener('click', closeAll);
document.getElementById('cwClose')?.addEventListener('click', closeAll);

//  AI CHAT (SocketIO + voice input) 
var aiMessages = document.getElementById('aiMessages');
var aiInput = document.getElementById('aiInput');
var aiSend = document.getElementById('aiSend');
var aiMic = document.getElementById('aiMic');
var aiVoiceBar = document.getElementById('aiVoiceBar');
var aiStatus = document.getElementById('aiStatus');
var aiSending = false;
var aiRecording = false;
var aiRecognition = null;

aiInput.addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 100) + 'px';
});
aiInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doAISend(); }
});
aiSend.addEventListener('click', doAISend);

function doAISend() {
  var text = aiInput.value.trim();
  if (!text || aiSending) return;
  addMsgWithPersistence(aiMessages, 'user', text);
  aiInput.value = '';
  aiInput.style.height = 'auto';
  aiSending = true;
  aiSend.disabled = true;
  aiStatus.textContent = 'Thinking...';
  showTyping(aiMessages, 'aiTyping');
  socket.emit('ai_message', { userId: userId, message: text });
}

// Voice input (speech‑to‑text)
(function setupAIVoice() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { if(aiMic) aiMic.style.opacity = '0.3'; return; }
  aiRecognition = new SR();
  aiRecognition.continuous = true;
  aiRecognition.interimResults = true;
  aiRecognition.lang = 'en-US';
  aiRecognition.onstart = function() {
    aiRecording = true;
    if(aiMic) aiMic.classList.add('recording');
    if(aiVoiceBar) aiVoiceBar.classList.add('active');
    if(aiStatus) aiStatus.textContent = 'Recording... click mic again to stop';
  };
  aiRecognition.onend = function() {
    if (aiRecording) {
      try { aiRecognition.start(); } catch(e) { stopAIRecording(); }
    } else {
      if(aiMic) aiMic.classList.remove('recording');
      if(aiVoiceBar) aiVoiceBar.classList.remove('active');
      if(aiStatus) aiStatus.textContent = 'Ask me anything about Elen';
    }
  };
  aiRecognition.onresult = function(event) {
    var transcript = '';
    for (var i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    if(aiInput) aiInput.value = transcript;
    if(aiInput) aiInput.style.height = 'auto';
  };
  aiRecognition.onerror = function(e) {
    console.error(e.error);
    stopAIRecording();
    if (e.error === 'not-allowed') {
      addMsgWithPersistence(aiMessages, 'bot', 'Microphone access denied. Please allow microphone and reload.');
    }
  };
  if(aiMic) {
    aiMic.addEventListener('click', function() {
      if (aiRecording) {
        stopAIRecording();
        setTimeout(function() { if (aiInput.value.trim()) doAISend(); }, 200);
      } else {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          addMsgWithPersistence(aiMessages, 'bot', '⚠️ Microphone requires HTTPS or localhost.');
          return;
        }
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(function(stream) { stream.getTracks().forEach(t => t.stop()); startAIRecording(); })
          .catch(function() { addMsgWithPersistence(aiMessages, 'bot', 'Microphone access denied.'); });
      }
    });
  }
  function startAIRecording() { try { aiRecognition.start(); aiRecording = true; } catch(e) {} }
  function stopAIRecording() { try { aiRecognition.stop(); } catch(e) {} aiRecording = false; }
})();

//  HUMAN CHAT (polling + persistence) 
var cwMessages   = document.getElementById('cwMessages');
var cwInput      = document.getElementById('cwInput');
var cwSend       = document.getElementById('cwSend');
var cwMic        = document.getElementById('cwMic');
var voiceBar     = document.getElementById('voiceBar');
var cwStatus     = document.getElementById('cwStatus');
var cwInputArea  = document.getElementById('cwInputArea');
var cwNamePrompt = document.getElementById('cwNamePrompt');
var cwNameInput  = document.getElementById('cwNameInput');
var cwNameSubmit = document.getElementById('cwNameSubmit');
var humanSending = false;
var pollTimer    = null;
var humanRecording = false;
var humanRecognition = null;

function showHumanChatUI() {
  if (cwNamePrompt) cwNamePrompt.style.display = 'none';
  if (cwMessages)   cwMessages.style.display   = 'flex';
  if (cwInputArea)  cwInputArea.style.display  = 'block';
  if (cwMessages && loadMessages('cwMessages').length > 0) {
    cwMessages.innerHTML = '';
    restoreMessages('cwMessages', cwMessages);
  } else if (cwMessages && cwMessages.children.length === 0) {
    addMsgWithPersistence(cwMessages, 'bot', 'Hello! Leave a message for Elen and she will reply here directly.');
  }
  scrollBottom(cwMessages);
  setTimeout(function () { if (cwInput) cwInput.focus(); }, 100);
  if (!pollTimer) startPolling();
}

if (cwNameSubmit) {
  cwNameSubmit.addEventListener('click', submitName);
}
if (cwNameInput) {
  cwNameInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') submitName(); });
}

function submitName() {
  var name = (cwNameInput ? cwNameInput.value.trim() : '') || 'Visitor';
  visitorName = name;
  localStorage.setItem('elen_name', name);
  showHumanChatUI();
  fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userId, name: name })
  }).catch(function () {});
}

if (visitorName && cwNamePrompt) {
  cwNamePrompt.style.display = 'none';
  if (cwMessages)  cwMessages.style.display  = 'flex';
  if (cwInputArea) cwInputArea.style.display = 'block';
  if (cwMessages && loadMessages('cwMessages').length > 0) {
    cwMessages.innerHTML = '';
    restoreMessages('cwMessages', cwMessages);
  } else if (cwMessages && cwMessages.children.length === 0) {
    addMsgWithPersistence(cwMessages, 'bot', 'Hello! Leave a message for Elen and she will reply here directly.');
  }
}

cwInput.addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 100) + 'px';
});
cwInput.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doHumanSend(); }
});
cwSend.addEventListener('click', doHumanSend);

function doHumanSend() {
  var text = cwInput.value.trim();
  if (!text || humanSending) return;
  addMsgWithPersistence(cwMessages, 'user', text);
  cwInput.value = '';
  cwInput.style.height = 'auto';
  humanSending = true;
  cwSend.disabled = true;
  fetch('/api/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userId, name: visitorName, text: text })
  })
  .then(function (r) { return r.json(); })
  .then(function (data) {
    humanSending = false;
    cwSend.disabled = false;
    if (data.error) addMsgWithPersistence(cwMessages, 'bot', 'Message could not be delivered. Please try again.');
  })
  .catch(function () {
    humanSending = false;
    cwSend.disabled = false;
    addMsgWithPersistence(cwMessages, 'bot', 'Connection error. Please try again.');
  });
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(pollReply, 3000);
}
function pollReply() {
  fetch('/api/poll?userId=' + encodeURIComponent(userId))
  .then(function (r) { return r.json(); })
  .then(function (data) {
    if (data.type === 'reply' && data.text) {
      addMsgWithPersistence(cwMessages, 'elen', data.text, 'Elen');
      cwStatus.textContent = 'Elen replied';
      setTimeout(function () { cwStatus.textContent = 'Usually replies within a few hours'; }, 5000);
      if (chatMode !== 'human') {
        notifCount++;
        fabBadge.textContent = notifCount;
        fabBadge.classList.add('show');
      }
    }
  })
  .catch(function () {});
}
startPolling();

// Human voice input
(function setupHumanVoice() {
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { if(cwMic) cwMic.style.opacity = '0.3'; return; }
  humanRecognition = new SR();
  humanRecognition.continuous = true;
  humanRecognition.interimResults = true;
  humanRecognition.lang = 'en-US';
  humanRecognition.onstart = function() {
    humanRecording = true;
    if(cwMic) cwMic.classList.add('recording');
    if(voiceBar) voiceBar.classList.add('active');
    if(cwStatus) cwStatus.textContent = 'Recording... click mic again to stop';
  };
  humanRecognition.onend = function() {
    if (humanRecording) { try { humanRecognition.start(); } catch(e) { stopHumanRecording(); } }
    else { if(cwMic) cwMic.classList.remove('recording'); if(voiceBar) voiceBar.classList.remove('active'); if(cwStatus) cwStatus.textContent = 'Usually replies within a few hours'; }
  };
  humanRecognition.onresult = function(event) {
    var transcript = '';
    for (var i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
    if(cwInput) cwInput.value = transcript;
    if(cwInput) cwInput.style.height = 'auto';
  };
  humanRecognition.onerror = function(e) { stopHumanRecording(); };
  if(cwMic) {
    cwMic.addEventListener('click', function() {
      if (humanRecording) {
        stopHumanRecording();
        setTimeout(function() { if (cwInput.value.trim()) doHumanSend(); }, 200);
      } else {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          addMsgWithPersistence(cwMessages, 'bot', '⚠️ Microphone requires HTTPS or localhost.');
          return;
        }
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(function(stream) { stream.getTracks().forEach(t => t.stop()); startHumanRecording(); })
          .catch(function() { addMsgWithPersistence(cwMessages, 'bot', 'Microphone access denied.'); });
      }
    });
  }
  function startHumanRecording() { try { humanRecognition.start(); humanRecording = true; } catch(e) {} }
  function stopHumanRecording() { try { humanRecognition.stop(); } catch(e) {} humanRecording = false; }
})();