# Elen Yeghiazaryan — Personal Portfolio

A full-stack personal website with an AI chat assistant and Telegram bot integration.

## Tech Stack
| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| AI | Rule-based bio matcher (zero external API cost) |
| Telegram | node-telegram-bot-api |
| Frontend | Vanilla JS + CSS3 (no frameworks needed) |
| Hosting | Any VPS / Render / Railway / Vercel (Node.js) |

---

## 🚀 Quick Start (5 minutes)

### Step 1 — Install Node.js
Make sure you have Node.js 18+ installed:
```bash
node --version   # should print v18.x or higher
```

If not, download from https://nodejs.org

---

### Step 2 — Set up the project

```bash
# Go into the project folder
cd elen-portfolio

# Install dependencies
npm install
```

---

### Step 3 — Create your Telegram Bot (takes 2 minutes)

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a name (e.g. "Elen Portfolio Bot")
4. Choose a username ending in `bot` (e.g. "ElenPortfolioBot")
5. BotFather gives you a token like: `8695040059:AAFtVSvo6Tpa9aDJ9...`  → **save this**

6. Now get your personal chat ID:
   - Start a conversation with your new bot (send it `/start`)
   - Visit this URL in your browser (replace YOUR_TOKEN):
     ```
     https://api.telegram.org/botYOUR_TOKEN/getUpdates
     ```
   - Find `"chat":{"id": XXXXXXX}` in the response — **that number is your ADMIN_CHAT_ID**

---

### Step 4 — Configure environment

```bash
# Copy the example env file
cp .env.example .env

# Edit it:
nano .env   # or open in any text editor
```

Fill in:
```
TELEGRAM_BOT_TOKEN=8695040059:AAFtVSvo6Tpa9aDJ9tadn3Ie6ljYyaFQTc4
TELEGRAM_ADMIN_CHAT_ID=1149625096
PORT=3000
```

---

### Step 5 — Run the server

```bash
npm start
```

Visit: **http://localhost:3000**

---

## How It Works

### AI Chat Assistant
- The chat widget appears as a floating button (bottom-right)
- Users can type questions OR use the **microphone button** for voice input
- The AI matches questions to Elen's bio using keyword matching — no external API needed
- Questions the AI can't answer are **forwarded to Elen's Telegram**
- The website polls `/api/poll` every 4 seconds — when Elen replies in Telegram, her answer appears in the chat

### Telegram Flow
```
User asks unknown question
         ↓
Backend forwards to Elen's Telegram (as a message)
         ↓
Elen REPLIES to that message in Telegram
         ↓
Bot detects the reply, stores it keyed by userId
         ↓
Website polls /api/poll → returns Elen's reply → shown in chat
```

### Per-User Separation
- Each visitor gets a unique `userId` stored in `localStorage`
- Telegram forwards include the userId (truncated)
- Elen's reply is stored and delivered only to that specific user's session

---

## Production Deployment

### Option A: Render.com (free tier, easy)
1. Push to GitHub
2. Create account at render.com
3. New → Web Service → connect your repo
4. Set environment variables in Render dashboard
5. Deploy!

### Option B: VPS (Ubuntu)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Clone/copy project
git clone YOUR_REPO /var/www/elen-portfolio
cd /var/www/elen-portfolio
npm install

# Install PM2 process manager
npm install -g pm2

# Create .env
cp .env.example .env
nano .env   # add your tokens

# Start with PM2
pm2 start server.js --name elen-portfolio
pm2 startup
pm2 save

# Install Nginx
sudo apt install nginx

# Nginx config
sudo nano /etc/nginx/sites-available/elen-portfolio
```

Nginx config:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/elen-portfolio /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL (for voice input on all devices)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Voice Input Notes
- Voice input uses the browser's Web Speech API
- Works on Chrome, Edge, Safari (modern versions)
- **HTTPS required** for voice on deployed sites (not needed on localhost)
- After speaking, the transcript auto-fills the input and sends automatically

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/ask` | Send `{ userId, question }` → returns `{ type, text }` |
| `GET` | `/api/poll?userId=X` | Check for Elen's Telegram reply for this user |
| `GET` | `/api/bio` | Returns full bio JSON |

---

## Useful Commands

```bash
# Start server
npm start

# Dev mode (auto-restart on file changes)
npm run dev

# Check if running (PM2)
pm2 status
pm2 logs elen-portfolio

# Restart
pm2 restart elen-portfolio
```

---

## File Structure

```
elen-portfolio/
├── server.js           ← Node.js/Express backend + Telegram bot
├── package.json
├── .env.example        ← Copy to .env and fill in your tokens
├── .env                ← Never commit this!
└── public/
    ├── index.html      ← Complete single-page portfolio
    ├── css/
    │   └── style.css   ← All styles (dark editorial theme)
    └── js/
        └── main.js     ← Chat widget, voice input, animations
```
