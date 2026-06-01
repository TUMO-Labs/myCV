# 🌐 Live Website

**https://elen-cv.viewdns.net**

---

# Elen Yeghiazaryan – Portfolio Website

A modern, fully interactive portfolio website featuring an AI assistant (Groq Llama 3.3), voice input, text‑to‑speech, real‑time chat (SocketIO), and Telegram‑based human chat.

---

## ✨ Features

- **AI Assistant** – Answers questions about Elen's CV and general knowledge (Groq API).  
- **Voice Input** – Speech‑to‑text (works on HTTPS).  
- **Text‑to‑Speech (TTS)** – AI reads answers; mute button included.  
- **Real‑time Chat** – SocketIO for instant AI responses.  
- **Human Chat** – Messages sent to a Telegram group; replies appear live.  
- **Conversation Persistence** – Messages survive page refresh (localStorage).  
- **Production Ready** – Nginx + Gunicorn + systemd + Let's Encrypt + No‑IP.

---

## 🛠️ Technologies

| Backend | Frontend | DevOps |
|---------|----------|--------|
| Flask | HTML5 / CSS3 | Nginx |
| Flask‑SocketIO | JavaScript (ES6) | Gunicorn + eventlet |
| Groq API (Llama 3.3) | SocketIO client | systemd |
| Telegram Bot API | Web Speech API | No‑IP (DDNS) |
| | LocalStorage | Let's Encrypt (SSL) |

---

## 📁 Project Structure

```
elen-flask/
├── app.py                # Main Flask application (AI, Telegram, SocketIO)
├── ai_profile.py         # System prompt for AI (Elen's CV + rules)
├── requirements.txt      # Python dependencies
├── .env.example          # Template for environment variables
├── portfolio.conf        # Nginx configuration (to be placed in /etc/nginx/sites-available/)
├── portfolio.service     # systemd service file (to be placed in /etc/systemd/system/)
├── templates/
│   └── index.html        # Portfolio HTML
├── static/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── main.js
│   └── img/
│       └── profile.jpg
└── README.md
```

---

## 🚀 Local Development

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/elen-flask.git
cd elen-flask
```

### 2. Create virtual environment and install dependencies

```bash
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Set up environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
nano .env
```

Required variables (see [Environment Variables](#-environment-variables)).

### 4. Run the Flask app

```bash
python app.py
```

Open `http://localhost:500` – voice works on localhost (no HTTPS needed).

---

## ☁️ Production Deployment (EC2 + No‑IP + Let's Encrypt)

### Step 1 – Launch EC2 instance

- Ubuntu 22.04 or 24.04 LTS (t2.micro free tier)
- Security group: allow SSH (22), HTTP (80), HTTPS (443) from 0.0.0.0/0

### Step 2 – Install system packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3-pip python3-venv nginx certbot python3-certbot-nginx git make gcc build-essential
```

### Step 3 – Clone your repository

```bash
git clone https://github.com/YOUR_USERNAME/elen-flask.git ~/elen-flask
cd ~/elen-flask
```

### Step 4 – Set up Python environment

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 5 – Create .env file

```bash
nano .env
```

Add your secrets (see below).

### Step 6 – Configure No‑IP (free dynamic DNS)

Register at [noip.com](https://noip.com) and create a hostname (e.g., `elen-cv.viewdns.net`).

Install No‑IP client:

```bash
wget https://www.noip.com/client/linux/noip-duc-linux.tar.gz
tar xzf noip-duc-linux.tar.gz
cd noip-2.1.9-1/
make
sudo make install
```

Follow the prompts to enter your No‑IP email, password, and hostname.  
The client will update your IP automatically.

### Step 7 – Configure Nginx

Copy the provided `portfolio.conf` to `/etc/nginx/sites-available/` and enable it:

```bash
sudo cp portfolio.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/portfolio.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### Step 8 – Obtain SSL certificate

```bash
sudo certbot --nginx -d elen-cv.viewdns.net   # replace with your hostname
```

### Step 9 – Create systemd service

Copy `portfolio.service` to `/etc/systemd/system/` and start it:

```bash
sudo cp portfolio.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start portfolio
sudo systemctl enable portfolio
```

### Step 10 – Test

Open `https://your-hostname.viewdns.net` – website should load with padlock.

---

## 📝 Environment Variables

Create `.env` with the following:

```
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx
TELEGRAM_BOT_TOKEN=8123456789:AAF...
TELEGRAM_GROUP_ID=-1001234567890
PORT=5002
SECRET_KEY=your-secret-key-here
```

- `GROQ_API_KEY` – from [console.groq.com](https://console.groq.com) (free)
- `TELEGRAM_BOT_TOKEN` – from [@BotFather](https://t.me/botfather)
- `TELEGRAM_GROUP_ID` – your Telegram group ID (negative number, e.g., `-1001234567890`)
- `PORT` – internal port for Gunicorn (must match Nginx `proxy_pass`)
- `SECRET_KEY` – generate with `python -c "import secrets; print(secrets.token_urlsafe(32))"`

---

## 🔧 Configuration Files

### portfolio.conf (Nginx)

Place in `/etc/nginx/sites-available/portfolio.conf`  
(adjust `server_name` and SSL paths to your domain)

```nginx
server {
    listen 80;
    server_name elen-cv.viewdns.net;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name elen-cv.viewdns.net;

    ssl_certificate /etc/letsencrypt/live/elen-cv.viewdns.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/elen-cv.viewdns.net/privkey.pem;

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

### portfolio.service (systemd)

Place in `/etc/systemd/system/portfolio.service`

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

### requirements.txt

```
flask>=3.0.0
flask-socketio>=5.3.6
eventlet>=0.33.3
gunicorn>=21.2.0
groq>=0.4.0
python-dotenv>=1.0.0
requests>=2.31.0
```

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| Voice input does nothing | Ensure site is accessed via HTTPS (padlock visible). |
| AI answers "I don't have that information" | Check `GROQ_API_KEY` in `.env`; restart service. |
| Telegram messages not delivered | Bot must be admin in group; group ID must be negative. |
| 502 Bad Gateway | Gunicorn not running: `sudo systemctl restart portfolio` and check logs. |
| Nginx 404 / connection refused | Verify Nginx config, test with `sudo nginx -t`, restart Nginx. |

---

## 📄 License

MIT – free to use and modify.

---

## 🙏 Acknowledgements

- [Groq](https://groq.com) for fast, free AI inference
- [No‑IP](https://noip.com) for free dynamic DNS
- [Let's Encrypt](https://letsencrypt.org) for free SSL
- [Flask](https://flask.palletsprojects.com) and [Flask‑SocketIO](https://flask-socketio.readthedocs.io)

Created by **Elen Yeghiazaryan** – [GitHub](https://github.com/YOUR_USERNAME)
