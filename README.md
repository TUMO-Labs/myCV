# 🌐 Elen Yeghiazaryan | Personal Portfolio

Personal portfolio with Flask backend, redesigned UI, and **live two-way Telegram chat**.

## ✨ What's new in this version
- Redesigned UI (DM Serif Display + DM Sans, refined color palette)
- All bugs fixed (year, animation flash, progress bars, mobile menu)
- Two-way Telegram chat: visitors message Elen → she replies in Telegram → reply appears live in the chat widget
- Dynamic copyright year (auto-updates)
- Placeholder image fixed (placehold.co instead of dead via.placeholder.com)

## 🛠 Tech Stack
- **Backend:** Python 3, Flask
- **Frontend:** HTML5, CSS3, Vanilla JS
- **Messaging:** Telegram Bot API (polling)
- **Deployment:** Gunicorn + Nginx

## 🚀 Running locally
```bash
git clone https://github.com/elenyeghiazaryan/portfolio.git && cd portfolio
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python app.py
# → http://localhost:5002
```

## 💬 Telegram Chat — How it works
1. Visitor types a message in the chat widget on the website
2. Message is sent to Elen's Telegram via the Bot API
3. Elen **replies to that specific message** in Telegram
4. The website polls `/poll-reply` and displays Elen's reply live in the chat

**Important:** Elen must *reply* (not just send a new message) to forward the answer to the right visitor.
