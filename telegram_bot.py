import requests

# ========================================
# REPLACE THESE WITH YOUR ACTUAL VALUES!
# ========================================
TELEGRAM_TOKEN = "8695040059:AAFtVSvo6Tpa9aDJ9tadn3Ie6ljYyaFQTc4"   # From @BotFather
TELEGRAM_CHAT_ID = "1149625096"   # From getUpdates URL
# ========================================

def send_to_telegram(user_name, user_message):
    """Send user message to your Telegram"""
    text = f"""📬 **New message from your portfolio website!**

👤 **Name:** {user_name}
💬 **Message:** {user_message}

🌐 From your portfolio chatbot"""

    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "Markdown"
    }

    try:
        response = requests.post(url, json=payload)
        return response.ok
    except Exception as e:
        print(f"Error sending to Telegram: {e}")
        return False