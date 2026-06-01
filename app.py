import os
import json
import threading
import time
import requests
import re
import hashlib
from flask import Flask, request, jsonify, render_template
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
from groq import Groq
from ai import SYSTEM_PROMPT

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'secret!')
socketio = SocketIO(app, cors_allowed_origins="*")

#  CONFIG 
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
GROUP_ID  = os.getenv("TELEGRAM_GROUP_ID", "")
TELEGRAM_API = f"https://api.telegram.org/bot{BOT_TOKEN}"

#IN-MEMORY STORES 
users = {}
msg_to_user = {}
group_has_topics = None
store_lock = threading.Lock()

#  AI SESSIONS (per user)
ai_sessions = {}
ai_lock = threading.Lock()

# CACHE 
ai_cache = {}
cache_lock = threading.Lock()
CACHE_TTL = 7200

# GROQ CLIENT 
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# INSTANT ANSWERS (covers common CV facts & fallbacks) 
INSTANT_ANSWERS = {
    "birthday": "Elen's birthday is 14 February 2005. She is 21 years old.",
    "age": "Elen is 21 years old (born 14 February 2005).",
    "email": "You can email Elen at elenyeg005@gmail.com",
    "gmail": "You can email Elen at elenyeg005@gmail.com",
    "emal": "You can email Elen at elenyeg005@gmail.com",
    "linkedin": "Elen's LinkedIn is linkedin.com/in/elen-yeghiazaryan",
    "github": "Elen's GitHub is github.com/elenyeghiazaryan",
    "location": "Elen is based in Yerevan, Armenia.",
    "phone": "Elen does not share her phone number publicly. Please contact her via email.",
    "number": "Elen does not share her phone number publicly.",
    "contact": "• Email: elenyeg005@gmail.com\n• LinkedIn: linkedin.com/in/elen-yeghiazaryan\n• GitHub: github.com/elenyeghiazaryan",
    "education": "• UFAR – Informatics & Applied Mathematics (2023–2027)\n• Université Paul Sabatier Toulouse III – Informatics & Applied Mathematics (2024–2027) (double degree)\n• Synopsys Armenia – Semiconductor Engineering (2024–2026)\n• Heratsi High School – Economics (2020–2023)\n• TUMO Labs – ClimateNet (2026–present)",
    "skills": "• Python, C, Java\n• Networking, IoT, ML\n• Semiconductor Engineering, MySQL\n• Raspberry Pi, ESP32, Arduino\n• Git, Linux, Bash, Vim",
    "projects": "• Raspberry Pi Mini Network & Gateway\n• Smart Evacuation System\n• Global Demographic Analysis\n• Voting App\n• Serverless Cloud APIs\n• RaspberryChat\n• Design Patterns in Python",
    "experience": "• ESL Teacher at Academy Polyglot (2024–2025)\n• Volunteer: Red Cross, Ministry of High‑Tech, Career Center, PAVU",
    "languages": "• Armenian (native)\n• English (native)\n• French (advanced)\n• Russian (conversational)\n• German (elementary)",
    "certificates": "• TOEFL\n• DELF B2\n• Technovation Girls\n• TUMO",
    "about": "Elen is purposeful, inquisitive, passionate about engineering, computation, and mathematics.",
    "hobbies": "arts, sports",
    "married": "I don't have information about Elen's marital status. You can contact Elen directly and she will answer.",
    "marriage": "I don't have information about Elen's marital status. You can contact Elen directly and she will answer.",
    "single": "I don't have information about that. Please contact Elen directly.",
    "relationship": "I don't have information about Elen's relationship status. Feel free to contact Elen directly.",
    "salary": "I don't have that information. You can contact Elen directly.",
    "religion": "I don't have that information. Please reach out to Elen personally.",
    "nice": "Glad to help! Let me know if you need anything else. 😊",
    "thx": "You're welcome! Let me know if you need anything else. 😊",
    "thanks": "You're welcome! Let me know if you need anything else. 😊",
    "thank you": "You're welcome! Let me know if you need anything else. 😊",
    "oki": "Great! Let me know if you have any questions about Elen. 😊",
    "ok": "Great! Let me know if you have any questions about Elen. 😊",
    "got it": "Awesome! Feel free to ask anything else. 😊",
    "cool": "Thanks! Ask away if you need more info. 😊",
    "great": "Happy to help! Anything else about Elen? 😊",
    "hey": "Hey! How can I help you today? 😊",
    "bro": "Hey! What can I assist you with? 😊",
    "hello": "Hello! How can I help you? 😊",
    "hi": "Hi there! How can I assist you? 😊",
    "bye": "Goodbye! Feel free to come back if you have more questions about Elen. 😊",
    "goodbye": "Goodbye! Have a great day! 😊",
    "see you": "See you later! 👋",
}

def get_instant_answer(question_lower):
    for keyword, answer in INSTANT_ANSWERS.items():
        if keyword in question_lower:
            return answer
    if any(w in question_lower for w in ('educ','study','university','college','school')):
        return INSTANT_ANSWERS["education"]
    if any(w in question_lower for w in ('skill','programm','tech','language','know')):
        return INSTANT_ANSWERS["skills"]
    if any(w in question_lower for w in ('project','built','github','code','made')):
        return INSTANT_ANSWERS["projects"]
    if any(w in question_lower for w in ('experi','work','job','volunteer','teach')):
        return INSTANT_ANSWERS["experience"]
    if any(w in question_lower for w in ('certif','certificate')):
        return INSTANT_ANSWERS["certificates"]
    if any(w in question_lower for w in ('contact','reach','email','phone','gmail','emal')):
        return INSTANT_ANSWERS["email"]
    return None

def strip_markdown(text):
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)
    text = re.sub(r'\*(.*?)\*', r'\1', text)
    text = re.sub(r'__(.*?)__', r'\1', text)
    text = re.sub(r'`(.*?)`', r'\1', text)
    text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
    return text

def strip_greetings_and_meta(text, name, already_greeted=True):
    if not already_greeted:
        return text
    lines = text.split('\n')
    cleaned = []
    for line in lines:
        lower_line = line.strip().lower()
        if lower_line.startswith(('hello', 'hi', 'hey', 'nice to meet you', 'how can i assist', 'glad to help', "i'm elen", "i am elen")):
            continue
        if re.search(rf"hello\s*,?\s*{re.escape(name)}", line, re.IGNORECASE):
            continue
        if re.search(rf"hi\s*,?\s*{re.escape(name)}", line, re.IGNORECASE):
            continue
        cleaned.append(line)
    result = '\n'.join(cleaned).strip()
    result = re.sub(r"(?i)(hello!?\s*)(how can i assist you\??)", "", result)
    return result

# TELEGRAM HELPERS (complete) 
def tg(method, payload):
    try:
        r = requests.post(f"{TELEGRAM_API}/{method}", json=payload, timeout=10)
        data = r.json()
        if not data.get("ok"):
            print(f"[TG] {method} failed: {data.get('description')}")
        return data
    except Exception as e:
        print(f"[TG] {method} exception: {e}")
        return None

def detect_group_mode():
    global group_has_topics
    if not BOT_TOKEN or not GROUP_ID:
        group_has_topics = False
        return
    data = tg("getChat", {"chat_id": GROUP_ID})
    if data and data.get("ok"):
        chat = data["result"]
        group_has_topics = bool(chat.get("is_forum", False))
        print(f"[TG] Group: {chat.get('title')} | Topics: {group_has_topics}")
    else:
        group_has_topics = False

def create_forum_topic(user_id, name):
    data = tg("createForumTopic", {
        "chat_id": GROUP_ID,
        "name": f"{name} — visitor",
        "icon_color": 7322096
    })
    if data and data.get("ok"):
        thread_id = data["result"]["message_thread_id"]
        tg("sendMessage", {
            "chat_id": GROUP_ID,
            "message_thread_id": thread_id,
            "text": f"Visitor: {name}\nID: {user_id[:14]}\n\nReply in this thread to respond."
        })
        print(f"[TG] Created topic {thread_id} for {name}")
        return thread_id
    else:
        print(f"[TG] createForumTopic failed — switching to regular mode")
        return None

def send_to_group(user_id, name, text):
    global group_has_topics
    if not BOT_TOKEN or not GROUP_ID:
        return True
    if group_has_topics is None:
        detect_group_mode()
    with store_lock:
        user = users.get(user_id)
        if not user:
            users[user_id] = {"name": name, "thread_id": None, "pending_replies": [], "introduced": False}
            user = users[user_id]
    if group_has_topics:
        thread_id = user.get("thread_id")
        if not thread_id:
            thread_id = create_forum_topic(user_id, name)
            if thread_id:
                with store_lock:
                    users[user_id]["thread_id"] = thread_id
            else:
                group_has_topics = False
        if thread_id:
            data = tg("sendMessage", {
                "chat_id": GROUP_ID,
                "message_thread_id": thread_id,
                "text": text
            })
            return bool(data and data.get("ok"))
    msg_text = f"[{name} / {user_id[:8]}]\n{text}"
    data = tg("sendMessage", {"chat_id": GROUP_ID, "text": msg_text})
    if data and data.get("ok"):
        sent_id = str(data["result"]["message_id"])
        with store_lock:
            msg_to_user[sent_id] = user_id
        return True
    return False

def register_user(user_id, name):
    global group_has_topics
    with store_lock:
        if user_id not in users:
            users[user_id] = {"name": name, "thread_id": None, "pending_replies": [], "introduced": False}
        users[user_id]["name"] = name
    if not BOT_TOKEN or not GROUP_ID:
        return
    if group_has_topics is None:
        detect_group_mode()
    if group_has_topics:
        user = users[user_id]
        if not user.get("thread_id"):
            thread_id = create_forum_topic(user_id, name)
            if thread_id:
                with store_lock:
                    users[user_id]["thread_id"] = thread_id
    else:
        user = users[user_id]
        if not user.get("introduced"):
            tg("sendMessage", {
                "chat_id": GROUP_ID,
                "text": f"New visitor: {name} ({user_id[:12]})\nTo reply, send: reply {user_id[:12]} your message"
            })
            with store_lock:
                users[user_id]["introduced"] = True

# TELEGRAM POLLING THREAD
last_update_id = 0

def poll_telegram():
    global last_update_id, group_has_topics
    if not BOT_TOKEN or not GROUP_ID:
        return
    print("[TG] Polling started")
    while True:
        try:
            data = tg("getUpdates", {
                "offset": last_update_id + 1,
                "timeout": 30,
                "allowed_updates": ["message"]
            })
            if not data or not data.get("ok"):
                time.sleep(3)
                continue
            for update in data.get("result", []):
                last_update_id = update["update_id"]
                msg = update.get("message")
                if not msg:
                    continue
                chat_id = str(msg.get("chat", {}).get("id", ""))
                text = msg.get("text", "")
                from_bot = msg.get("from", {}).get("is_bot", False)
                if chat_id != str(GROUP_ID) or from_bot or not text:
                    continue
                thread_id = msg.get("message_thread_id")
                if thread_id:
                    with store_lock:
                        for uid, user in users.items():
                            if user.get("thread_id") == thread_id:
                                user["pending_replies"].append({"text": text, "ts": time.time()})
                                break
                else:
                    reply_to = msg.get("reply_to_message")
                    if reply_to:
                        orig_id = str(reply_to.get("message_id", ""))
                        with store_lock:
                            uid = msg_to_user.get(orig_id)
                            if uid and uid in users:
                                users[uid]["pending_replies"].append({"text": text, "ts": time.time()})
                                msg_to_user.pop(orig_id, None)
                                continue
                    if text.lower().startswith("reply "):
                        parts = text.split(" ", 2)
                        if len(parts) >= 3:
                            prefix = parts[1].lower()
                            reply_text = parts[2]
                            with store_lock:
                                matched = None
                                for uid in users:
                                    if uid.lower().startswith(prefix):
                                        matched = uid
                                        break
                            if matched:
                                with store_lock:
                                    users[matched]["pending_replies"].append({"text": reply_text, "ts": time.time()})
                                tg("sendMessage", {"chat_id": GROUP_ID, "text": f"Delivered to {users[matched]['name']}"})
                            else:
                                tg("sendMessage", {"chat_id": GROUP_ID, "text": f'User "{prefix}" not found.'})
                        continue
                    with store_lock:
                        user_list = "\n".join(f"• {u['name']} — {uid[:12]}" for uid, u in users.items()) or "(none yet)"
                    tg("sendMessage", {
                        "chat_id": GROUP_ID,
                        "text": f"To reply to a visitor:\n1. Reply directly to their message\n2. Type: reply <userId> your message\n\nActive visitors:\n{user_list}"
                    })
        except Exception as e:
            print(f"[TG] Poll error: {e}")
            time.sleep(5)

if BOT_TOKEN and GROUP_ID:
    t = threading.Thread(target=poll_telegram, daemon=True)
    t.start()
else:
    print("[TG] WARNING: TELEGRAM_BOT_TOKEN or TELEGRAM_GROUP_ID not set in .env")

# FLASK ROUTES 
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/register", methods=["POST"])
def api_register():
    data = request.get_json() or {}
    user_id = data.get("userId", "")
    name = (data.get("name") or "Visitor").strip() or "Visitor"
    if not user_id:
        return jsonify({"error": "userId required"}), 400
    threading.Thread(target=register_user, args=(user_id, name), daemon=True).start()
    return jsonify({"ok": True})

@app.route("/api/message", methods=["POST"])
def api_message():
    data = request.get_json() or {}
    user_id = data.get("userId", "")
    name = (data.get("name") or "Visitor").strip() or "Visitor"
    text = (data.get("text") or "").strip()
    if not user_id or not text:
        return jsonify({"error": "userId and text required"}), 400
    ok = send_to_group(user_id, name, text)
    if ok:
        return jsonify({"ok": True})
    return jsonify({"error": "Could not deliver message to Telegram"}), 500

@app.route("/api/poll")
def api_poll():
    user_id = request.args.get("userId", "")
    if not user_id:
        return jsonify({"error": "userId required"}), 400
    with store_lock:
        user = users.get(user_id)
        if user and user["pending_replies"]:
            reply = user["pending_replies"].pop(0)
            return jsonify({"type": "reply", "text": reply["text"]})
    return jsonify({"type": "none"})

@app.route("/api/users")
def api_users():
    with store_lock:
        summary = {uid: {"name": u["name"], "thread_id": u.get("thread_id"), "pending": len(u["pending_replies"])}
                   for uid, u in users.items()}
    return jsonify({"group_mode": "forum" if group_has_topics else "regular", "group_id": GROUP_ID, "users": summary})

# SOCKETIO AI HANDLER (Groq, with instant answers and cache) 
@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")

@socketio.on('ai_message')
def handle_ai_message(data):
    user_id = data.get('userId')
    question = data.get('message', '').strip()
    if not user_id or not question:
        emit('ai_error', {'error': 'Missing userId or message'})
        return

    with ai_lock:
        if user_id not in ai_sessions:
            ai_sessions[user_id] = {"history": [], "name": None, "greeted": False}
        session = ai_sessions[user_id]

    question_lower = question.lower()

    # 1) Name introduction (no API)
    extracted_name = None
    name_match = re.search(r"(?:my name is|i'm|i am)\s+([A-Za-z]+)", question, re.IGNORECASE)
    if name_match:
        extracted_name = name_match.group(1).capitalize()
    else:
        words = question.strip().split()
        if len(words) == 1 and words[0].isalpha() and 2 <= len(words[0]) <= 20:
            common = {'hello','hi','hey','nice','thx','thanks','oki','ok','got','cool','great','education','skills','projects','experience','birthday','age','email','github','linkedin','location','phone','number','contact','about','personality','hobbies','interests','certificates','languages','ufar','tumo','synopsys','raspberry','evacuation','voting','serverless','design','bye','goodbye','see you','exit','quit','bro','hey','hi','hello','gmail','emal','married','marriage','single','relationship','salary','religion'}
            if words[0].lower() not in common:
                extracted_name = words[0].capitalize()
    if extracted_name and not session["name"]:
        session["name"] = extracted_name
        session["greeted"] = True
        greeting = f"Hey, {session['name']}! How can I assist you today?"
        session["history"].append({"role": "user", "content": question})
        session["history"].append({"role": "assistant", "content": greeting})
        emit('ai_response', {'answer': greeting})
        return

    # 2) Instant answers (no API)
    instant = get_instant_answer(question_lower)
    if instant:
        answer = strip_markdown(instant)
        session["history"].append({"role": "user", "content": question})
        session["history"].append({"role": "assistant", "content": answer})
        if len(session["history"]) > 20:
            session["history"] = session["history"][-20:]
        if session["name"] and not session["greeted"]:
            session["greeted"] = True
            answer = f"Hey, {session['name']}! How can I assist you today?\n\n{answer}"
        emit('ai_response', {'answer': answer})
        return

    # 3) Cache
    cache_key = hashlib.md5(question_lower.encode()).hexdigest()
    with cache_lock:
        cached = ai_cache.get(cache_key)
        if cached and cached["expires"] > time.time():
            raw_reply = cached["answer"]
            raw_reply = strip_markdown(raw_reply)
            if session["greeted"]:
                raw_reply = strip_greetings_and_meta(raw_reply, session.get("name", ""), session["greeted"])
            session["history"].append({"role": "user", "content": question})
            session["history"].append({"role": "assistant", "content": raw_reply})
            if len(session["history"]) > 20:
                session["history"] = session["history"][-20:]
            if session["name"] and not session["greeted"]:
                session["greeted"] = True
                raw_reply = f"Hey, {session['name']}! How can I assist you today?\n\n{strip_greetings_and_meta(raw_reply, session['name'], True)}"
            emit('ai_response', {'answer': raw_reply})
            return

    # 4) Groq API call (fast, general knowledge)
    if not groq_client:
        emit('ai_response', {'answer': "Groq API key not configured. Check .env file."})
        return

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for entry in session["history"][-10:]:
        role = "assistant" if entry["role"] == "assistant" else "user"
        messages.append({"role": role, "content": entry["content"]})
    messages.append({"role": "user", "content": question})

    try:
        print(f"[Groq] Asking: {question[:60]}...")
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=250,
            temperature=0.3,
            timeout=10
        )
        answer = response.choices[0].message.content
        answer = strip_markdown(answer)
        if session["greeted"]:
            answer = strip_greetings_and_meta(answer, session.get("name", ""), session["greeted"])
        with cache_lock:
            ai_cache[cache_key] = {"answer": answer, "expires": time.time() + CACHE_TTL}
        session["history"].append({"role": "user", "content": question})
        session["history"].append({"role": "assistant", "content": answer})
        if len(session["history"]) > 20:
            session["history"] = session["history"][-20:]
        if session["name"] and not session["greeted"]:
            session["greeted"] = True
            answer = f"Hey, {session['name']}! How can I assist you today?\n\n{answer}"
        emit('ai_response', {'answer': answer})
    except Exception as e:
        print(f"[Groq] Error: {e}")
        emit('ai_response', {'answer': "I'm having trouble connecting. Please try again in a moment."})

if __name__ == "__main__":
    port = int(os.getenv("PORT", 500))
    print(f"\nStarting Elen's portfolio at http://localhost:{port}")
    print(f"Bot token: {'SET' if BOT_TOKEN else 'NOT SET'}")
    print(f"Group ID:  {GROUP_ID or 'NOT SET'}")
    print(f"Groq: {'Configured' if GROQ_API_KEY else 'MISSING'}\n")
    socketio.run(app, host="0.0.0.0", port=port, debug=False, use_reloader=False)