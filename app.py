from flask import Flask, render_template, jsonify
import json

app = Flask(__name__)

# Your portfolio data
portfolio_data = {
    "name": "Elen Yeghiazaryan",
    "title": "CS & Applied Mathematics Student",
    "email": "elenyeg005@gmail.com",
    "github": "https://github.com/elenyeghiazaryan",
    "linkedin": "https://www.linkedin.com/in/elen-yeghiazaryan/",
    
    "about": "I'm a curious student who enjoys exploring how technology works and how it can be used to solve real-world problems. I'm especially interested in the connection between programming, mathematics, and engineering, and lately I've been diving deeper into areas like hardware, IoT, and data science. I like learning by building, experimenting, and challenging myself, and I'm always looking for new ways to grow and create something meaningful.",
    
    "education": [
        {"institution": "French University of Armenia", "degree": "Mathematics and Computer Science", "period": "2023 - 2027"},
        {"institution": "Université Paul Sabatier Toulouse III", "degree": "Computer Science", "period": "2024 - 2027"},
        {"institution": "Synopsys Armenia", "degree": "Semiconductor Engineering", "period": "2024 - Present"},
        {"institution": "Heratsi High School", "degree": "Economics", "period": "2020 - 2023"}
    ],
    
    "work": [
        {
            "title": "ESL Teacher",
            "company": "Academy Polyglot",
            "period": "2024 - Present",
            "responsibilities": [
                "Designed lessons for A1-C1 learners",
                "Created interactive learning games and activities",
                "Delivered engaging online lessons",
                "Improved students' speaking confidence and pronunciation"
            ]
        }
    ],
    
    "volunteer": [
        "Ministry of High-Tech Industry",
        "PAVU (Digitec)",
        "Armenian Red Cross Society"
    ],
    
    "skills": {
        "Programming": ["Python", "C", "Java", "JavaScript"],
        "Web & Tools": ["Flask", "Git/GitHub", "VS Code", "Linux CLI"],
        "Data & IoT": ["Machine Learning", "SQL", "IoT", "Arduino/ESP32"],
        "Other": ["Problem-solving", "Communication", "Teamwork", "Public Speaking"]
    },
    
    "languages": [
        {"name": "Armenian", "level": "Native"},
        {"name": "English", "level": "Fluent"},
        {"name": "French", "level": "Fluent"},
        {"name": "Russian", "level": "Conversational"},
        {"name": "German", "level": "Elementary"}
    ],
    
    "projects": [
        {
            "name": "Smart Home IoT System",
            "description": "ESP32-based home automation with temperature and humidity monitoring",
            "tech": ["C++", "Arduino", "IoT"],
            "link": "https://github.com/elenyeghiazaryan"
        },
        {
            "name": "Machine Learning Analysis",
            "description": "Statistical analysis and prediction models using Python",
            "tech": ["Python", "Pandas", "Scikit-learn"],
            "link": "https://github.com/elenyeghiazaryan"
        },
        {
            "name": "Portfolio Website",
            "description": "Personal portfolio built with Flask",
            "tech": ["Python", "Flask", "HTML/CSS", "JS"],
            "link": "https://github.com/elenyeghiazaryan"
        }
    ]
}

@app.route('/')
def home():
    return render_template('index.html', data=portfolio_data)

@app.route('/api/data')
def api_data():
    return jsonify(portfolio_data)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)