from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__)

TELEGRAM_TOKEN   = "8695040059:AAFtVSvo6Tpa9aDJ9tadn3Ie6ljYyaFQTc4"
TELEGRAM_CHAT_ID = "1149625096"
TELEGRAM_API     = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

# session_id → {name, message_id}  — routes Elen's Telegram replies back to visitors
pending_replies: dict = {}

portfolio_data = {
    "name":     "Elen Yeghiazaryan",
    "title":    "CS & Applied Mathematics Student",
    "email":    "elenyeg005@gmail.com",
    "github":   "https://github.com/elenyeghiazaryan",
    "linkedin": "https://www.linkedin.com/in/elen-yeghiazaryan/",
    "about": (
        "I'm a curious student who enjoys exploring how technology works and how it "
        "can be used to solve real-world problems. I'm especially interested in the "
        "connection between programming, mathematics, and engineering, and lately I've "
        "been diving deeper into areas like hardware, IoT, and data science. I like "
        "learning by building, experimenting, and challenging myself, and I'm always "
        "looking for new ways to grow and create something meaningful."
    ),
    "education": [
        {"institution": "French University of Armenia",          "degree": "Bachelor's, Mathematics and Computer Science", "period": "Sep 2023 – May 2027"},
        {"institution": "Université Paul Sabatier Toulouse III", "degree": "Bachelor's, Computer Science",                "period": "Sep 2024 – May 2027"},
        {"institution": "Synopsys Armenia Educational Department","degree": "Semiconductor Engineering",                   "period": "2024 – Present"},
        {"institution": "Heratsi High School",                   "degree": "Economics stream",                            "period": "Sep 2020 – May 2023"},
    ],
    "work_experience": [
        {
            "title": "ESL Teacher", "company": "Academy Polyglot", "period": "Jan 2024 – Present",
            "responsibilities": [
                "Designed lessons for A1–C1 learners",
                "Created grammar, vocabulary, and speaking activities",
                "Developed interactive learning games",
                "Delivered engaging online and in-person lessons",
                "Supported students individually to improve fluency and accuracy",
                "Improved students' speaking confidence and pronunciation",
                "Prepared students for exams and presentations",
            ],
        }
    ],
    "volunteer_experience": [
        {"organization": "Ministry of High-Tech Industry", "role": "Volunteer"},
        {"organization": "PAVU (Digitec)",                 "role": "Volunteer"},
        {"organization": "Armenian Red Cross Society",      "role": "Volunteer"},
    ],
    "skills": {
        "Programming Languages": ["Python", "C", "Java"],
        "Technical Skills":      ["Algorithms & Data Structures","Intro to IoT","Networking","Computer Architecture","Operating Systems","Machine Learning","Databases (SQL)","Statistics","Numerical Analysis","Electronics"],
        "Tools & Software":      ["Git / GitHub","Vim","VS Code","Shell / Linux / CLI","Jupyter Notebook","Microsoft Office","Canva","Google Classroom","Zoom","Tinkercad (Arduino / ESP32)"],
        "Certifications":        ["TOEFL","Diplomas from various competitions"],
        "Soft Skills":           ["Problem-solving","Strong Communication","Public Speaking","Time Management","Teamwork","Explaining Complex Concepts Simply"],
    },
    "languages": [
        {"name": "Armenian", "level": "Native",        "percentage": 100},
        {"name": "English",  "level": "Fluent",        "percentage": 90},
        {"name": "French",   "level": "Fluent",        "percentage": 90},
        {"name": "Russian",  "level": "Conversational","percentage": 70},
        {"name": "German",   "level": "Elementary",    "percentage": 40},
    ],
    "projects": [
        {"name": "Smart Home IoT System",          "description": "ESP32-based home automation system with temperature and humidity monitoring.",              "technologies": ["C++","Arduino","IoT","ESP32"],                  "github": "https://github.com/elenyeghiazaryan"},
        {"name": "Machine Learning Data Analysis", "description": "Statistical analysis and prediction models using Python.",                                 "technologies": ["Python","Pandas","Scikit-learn","Jupyter"],     "github": "https://github.com/elenyeghiazaryan"},
        {"name": "Portfolio Website",              "description": "Personal portfolio with Flask backend and live two-way Telegram chat widget.",             "technologies": ["Python","Flask","HTML/CSS","JavaScript"],       "github": "https://github.com/elenyeghiazaryan"},
        {"name": "Database Management System",     "description": "SQL-based library management system.",                                                     "technologies": ["SQL","Python","SQLite"],                        "github": "https://github.com/elenyeghiazaryan"},
    ],
}


@app.route("/")
def home():
    return render_template("index.html", data=portfolio_data)


@app.route("/api/data")
def api_data():
    return jsonify(portfolio_data)


@app.route("/send-message", methods=["POST"])
def send_message():
    body       = request.get_json(force=True)
    name       = (body.get("name") or "Anonymous").strip()
    message    = (body.get("message") or "").strip()
    session_id = (body.get("session_id") or "unknown")

    if not message:
        return jsonify({"status": "error", "message": "Empty message"}), 400

    text = (
        f"\U0001f4ec *New message from your portfolio!*\n\n"
        f"\U0001f464 *Name:* {name}\n"
        f"\U0001f4ac *Message:* {message}\n\n"
        f"_Reply to THIS message in Telegram — the visitor will see your reply live!_"
    )

    try:
        r = requests.post(f"{TELEGRAM_API}/sendMessage",
                          json={"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "Markdown"},
                          timeout=8)
        r.raise_for_status()
        msg_id = r.json()["result"]["message_id"]
        pending_replies[str(msg_id)] = {"session_id": session_id, "name": name}
        return jsonify({"status": "success", "message_id": msg_id})
    except Exception as e:
        app.logger.error("Telegram send error: %s", e)
        return jsonify({"status": "error", "message": "Failed to reach Telegram"}), 500


@app.route("/poll-reply", methods=["GET"])
def poll_reply():
    """Long-poll: visitor waits for Elen's Telegram reply."""
    session_id      = request.args.get("session_id", "")
    after_update_id = int(request.args.get("after_update_id", "0"))

    try:
        r = requests.get(f"{TELEGRAM_API}/getUpdates",
                         params={"offset": after_update_id + 1, "timeout": 5, "limit": 20},
                         timeout=12)
        r.raise_for_status()
        updates = r.json().get("result", [])

        for upd in updates:
            msg      = upd.get("message", {})
            reply_to = msg.get("reply_to_message", {})
            orig_id  = str(reply_to.get("message_id", ""))

            if orig_id and orig_id in pending_replies:
                stored = pending_replies[orig_id]
                if stored["session_id"] == session_id:
                    del pending_replies[orig_id]
                    return jsonify({"status": "reply", "text": msg.get("text",""), "update_id": upd["update_id"]})

        last_id = updates[-1]["update_id"] if updates else after_update_id
        return jsonify({"status": "waiting", "update_id": last_id})

    except Exception as e:
        app.logger.error("Poll error: %s", e)
        return jsonify({"status": "error"}), 500


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5002)
