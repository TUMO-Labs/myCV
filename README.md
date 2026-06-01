# Elen Yeghiazaryan – Portfolio Website

A modern, fully interactive portfolio website for Elen Yeghiazaryan, featuring an AI assistant (powered by Groq), voice input, text-to-speech, real‑time chat via SocketIO, and a Telegram‑based human chat system.

🌐 **Live demo:** `https://your-subdomain.duckdns.org` (after deployment)

---

## ✨ Features

- **AI Assistant** – Answers questions about Elen's CV and general knowledge (using Groq Llama 3.3 70B).  
- **Voice Input** – Speak to the AI (speech‑to‑text) – works on HTTPS or localhost.  
- **Text‑to‑Speech (TTS)** – AI reads answers aloud; mute button included.  
- **Real‑time Chat** – SocketIO for instant AI responses (no polling delay).  
- **Human Chat** – Messages sent to a Telegram group; replies appear live on the website.  
- **Conversation Persistence** – Messages survive page refresh (saved in localStorage).  
- **Responsive Design** – Smooth animations, custom cursor, dark/light theme.  
- **Production‑Ready** – Deploy with Nginx, Gunicorn, systemd, DuckDNS, and Let's Encrypt (HTTPS).

---

## 🛠️ Technologies

| Backend | Frontend | DevOps |
|---------|----------|--------|
| Flask | HTML5 / CSS3 | Nginx |
| Flask‑SocketIO | JavaScript (ES6) | Gunicorn + eventlet |
| Groq API (Llama 3.3) | SocketIO client | systemd |
| Telegram Bot API | Web Speech API (voice) | DuckDNS |
| | LocalStorage (persistence) | Let's Encrypt (SSL) |

---

## 📁 Project Structure

```
elen-flask/
├── app.py                # Main Flask application (SocketIO, AI, Telegram)
├── ai_profile.py         # System prompt for the AI (Elen's CV + rules)
├── requirements.txt      # Python dependencies
├── .env.example          # Template for environment variables
├── templates/
│   └── index.html        # Portfolio HTML (unchanged design)
├── static/
│   ├── css/
│   │   └── style.css     # Original styling (preserved)
│   ├── js/
│   │   └── main.js       # Frontend logic (voice, TTS, SocketIO, persistence)
│   └── img/
│       └── profile.jpg   # Elen's photo
└── README.md             # This file
```

---

## ⚙️ Requirements

- **Python 3.8+**
- **Groq API key** (free) – [console.groq.com](https://console.groq.com)
- **Telegram Bot Token** – from [@BotFather](https://t.me/botfather)
- **Telegram Group ID** (negative number, e.g. `-1001234567890`)
- (Optional for deployment) – **DuckDNS domain** and **EC2** (or any VPS)

---

## 🚀 Local Development (Quick Start)

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/elen-flask.git
cd elen-flask
```

### 2. Create a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Set up environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
nano .env
```

Minimum required:

```
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx
TELEGRAM_BOT_TOKEN=8123456789:AAF...
TELEGRAM_GROUP_ID=-1001234567890
PORT=500
SECRET_KEY=your-secret-key-here
```

### 5. Run the Flask app

```bash
python app.py
```

Open `http://localhost:500` in your browser.  
Voice works on localhost (no HTTPS needed for local testing).

---

## ☁️ Production Deployment (EC2 + DuckDNS + Let's Encrypt)

For public access and voice on any device, you need HTTPS. The following steps use an AWS EC2 Ubuntu instance, but work on any VPS.

### Step 1 – Launch EC2 instance

- Ubuntu 22.04 or 24.04 LTS (t2.micro free tier)
- Security group rules:
  - SSH (22) – your IP
  - HTTP (80) – 0.0.0.0/0
  - HTTPS (443) – 0.0.0.0/0

### Step 2 – Install system packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv nginx certbot python3-certbot-nginx git
```

### Step 3 – Upload your project

From your local machine:

```bash
scp -i your-key.pem -r /path/to/elen-flask ubuntu@your-ec2-ip:~/
```

### Step 4 – Set up Python environment on EC2

```bash
cd ~/elen-flask
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 5 – Configure DuckDNS (free dynamic DNS)

Register a subdomain at [duckdns.org](https://duckdns.org) (e.g., `elen-cv`).

Install the update script:

```bash
mkdir -p ~/duckdns
cd ~/duckdns
wget https://raw.githubusercontent.com/duckdns/duckdns/master/duck.sh
chmod +x duck.sh
echo "token=YOUR_DUCK_DNS_TOKEN
domain=elen-cv" > duck.conf
./duck.sh   # should print "OK"
```

Set up cron to run every 5 minutes:

```bash
crontab -e
# Add line: */5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1
```

### Step 6 – Nginx configuration

Create `/etc/nginx/sites-available/elen-cv`:

```nginx
server {
    listen 80;
    server_name elen-cv.duckdns.org;

    location / {
        proxy_pass http://127.0.0.1:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5002/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/elen-cv /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

### Step 7 – Obtain SSL certificate (HTTPS)

```bash
sudo certbot --nginx -d elen-cv.duckdns.org
```

Follow prompts – after success, your site is accessible over `https://...`.

### Step 8 – systemd service for Gunicorn

Create `/etc/systemd/system/elen-cv.service`:

```ini
[Unit]
Description=Gunicorn instance for Elen CV (SocketIO)
After=network.target

[Service]
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/elen-flask
Environment="PATH=/home/ubuntu/elen-flask/venv/bin"
EnvironmentFile=/home/ubuntu/elen-flask/.env
ExecStart=/home/ubuntu/elen-flask/venv/bin/gunicorn \
    --worker-class eventlet \
    --workers 1 \
    --bind 127.0.0.1:5002 \
    app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

Start and enable:

```bash
sudo systemctl daemon-reload
sudo systemctl start elen-cv
sudo systemctl enable elen-cv
sudo systemctl status elen-cv   # should show "active (running)"
```

### Step 9 – Environment file on EC2

Create `/home/ubuntu/elen-flask/.env` with the same variables as in local development.

### Step 10 – Test

Visit `https://elen-cv.duckdns.org` – all features (including voice) should work.

---

## 🔧 Troubleshooting

| Issue | Likely cause | Solution |
|-------|-------------|----------|
| Voice input does nothing | Not using HTTPS or localhost | Deploy with DuckDNS + Let's Encrypt, or test on localhost |
| AI answers "I don't have that information" | Question not in instant answers, and API call failed | Check `GROQ_API_KEY` in `.env`; restart service |
| Telegram messages not delivered | Bot not admin, wrong group ID, or Topics disabled | Make bot admin, enable Topics, verify group ID (negative) |
| SocketIO connection fails | Nginx missing `/socket.io/` location or wrong `proxy_pass` | Ensure Nginx config includes the location block |
| 502 Bad Gateway | Gunicorn not running | `sudo systemctl restart elen-cv` and check logs: `journalctl -u elen-cv -f` |
| Conversation disappears after refresh | localStorage cleared or browser privacy settings | Ensure cookies/localStorage are enabled; messages are saved per userId |

---

## 📝 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `GROQ_API_KEY` | API key from [console.groq.com](https://console.groq.com) | `gsk_...` |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | `8123456789:AAF...` |
| `TELEGRAM_GROUP_ID` | Your Telegram group ID (negative) | `-1001234567890` |
| `PORT` | Port for Flask (Gunicorn uses 5002, Nginx proxies) | `5002` |
| `SECRET_KEY` | Flask secret key – generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"` | `-WGYsj2m6gMqR-...` |

---

## 🤝 Contributing

This is a personal portfolio; contributions are not expected. However, if you find bugs, feel free to open an issue.
