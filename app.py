from flask import Flask, render_template, request, jsonify
from telegram_bot import send_to_telegram

app = Flask(__name__)

portfolio_data = {
    "name": "Elen Yeghiazaryan",
    "title": "CS & Applied Mathematics Student",
    "email": "elenyeg005@gmail.com",
    "github": "https://github.com/elenyeghiazaryan",
    "linkedin": "https://www.linkedin.com/in/elen-yeghiazaryan/",

    "about": "I'm a curious student who enjoys exploring how technology works and how it can be used to solve real-world problems. I'm especially interested in the connection between programming, mathematics, and engineering, and lately I've been diving deeper into areas like hardware, IoT, and data science. I like learning by building, experimenting, and challenging myself, and I'm always looking for new ways to grow and create something meaningful.",

    "education": [
        {"institution": "French University of Armenia", "degree": "Bachelor's degree, Mathematics and Computer Science", "period": "Sep 2023 - May 2027"},
        {"institution": "Université Paul Sabatier Toulouse III", "degree": "Bachelor's degree, Computer Science", "period": "Sep 2024 - May 2027"},
        {"institution": "Synopsys Armenia Educational Department", "degree": "Semiconductor Engineering", "period": "2024 – Present"},
        {"institution": "Heratsi High School", "degree": "Economics stream", "period": "Sep 2020 - May 2023"}
    ],

    "work_experience": [
        {
            "title": "ESL Teacher",
            "company": "Academy Polyglot",
            "period": "Jan 2024 - Present",
            "responsibilities": [
                "Designed lessons for A1-C1 learners",
                "Created grammar, vocabulary, and speaking activities",
                "Developed interactive learning games",
                "Delivered engaging online lessons",
                "Supported students individually to improve fluency and accuracy",
                "Improved students' speaking confidence and pronunciation",
                "Prepared students for exams and presentations"
            ]
        }
    ],

    "volunteer_experience": [
        {"organization": "Ministry of High-Tech Industry", "role": "Volunteer"},
        {"organization": "PAVU (Digitec)", "role": "Volunteer"},
        {"organization": "Armenian Red Cross Society", "role": "Volunteer"}
    ],

    "skills": {
        "Programming Languages": ["Python", "C", "Java"],
        "Technical Skills": ["Algorithms & Data Structures", "Intro to IoT", "Network", "Computer Architecture", "Operating Systems", "Machine Learning", "Databases (SQL)", "Statistics", "Numerical Analysis", "Electronics"],
        "Tools & Software": ["Git/GitHub", "Vim", "VS Code", "Shell / Linux / CLI", "Jupyter Notebook", "Microsoft Office", "Canva", "Google Classroom", "Zoom", "PowerPoint", "Tinkercad (Arduino/ESP32)"],
        "Certifications": ["TOEFL", "Diplomas from different competitions"],
        "Soft Skills": ["Problem-solving", "Strong Communication", "Public Speaking", "Time Management", "Teamwork", "Ability to Explain Complex Concepts Simply"]
    },

    "languages": [
        {"name": "Armenian", "level": "Native", "percentage": 100},
        {"name": "English", "level": "Fluent", "percentage": 90},
        {"name": "French", "level": "Fluent", "percentage": 90},
        {"name": "Russian", "level": "Conversational", "percentage": 70},
        {"name": "German", "level": "Elementary", "percentage": 40}
    ],

    "projects": [
        {
            "name": "Smart Home IoT System",
            "description": "ESP32-based home automation system with temperature and humidity monitoring",
            "technologies": ["C++", "Arduino", "IoT", "ESP32"],
            "github": "https://github.com/elenyeghiazaryan"
        },
        {
            "name": "Machine Learning Data Analysis",
            "description": "Statistical analysis and prediction models using Python",
            "technologies": ["Python", "Pandas", "Scikit-learn", "Jupyter"],
            "github": "https://github.com/elenyeghiazaryan"
        },
        {
            "name": "Portfolio Website",
            "description": "Personal portfolio built with Flask and interactive chat",
            "technologies": ["Python", "Flask", "HTML/CSS", "JS"],
            "github": "https://github.com/elenyeghiazaryan"
        },
        {
            "name": "Database Management System",
            "description": "SQL-based library management system",
            "technologies": ["SQL", "Python", "SQLite"],
            "github": "https://github.com/elenyeghiazaryan"
        }
    ]
}

@app.route('/')
def home():
    return render_template('index.html', data=portfolio_data)

@app.route('/api/data')
def api_data():
    return jsonify(portfolio_data)

@app.route('/send-message', methods=['POST'])
def send_message():
    data = request.get_json()
    name = data.get('name', 'Anonymous')
    message = data.get('message', 'No message')
    
    success = send_to_telegram(name, message)
    
    if success:
        return jsonify({"status": "success", "message": "Message sent!"})
    else:
        return jsonify({"status": "error", "message": "Failed to send"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)