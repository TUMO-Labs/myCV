// Mobile menu toggle
const menuBtn = document.querySelector('.menu-btn');
const navLinks = document.querySelector('.nav-links');

if (menuBtn) {
    menuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });
}

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
            // Close mobile menu if open
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
            }
        }
    });
});

// Navbar background change on scroll
window.addEventListener('scroll', () => {
    const nav = document.querySelector('nav');
    if (window.scrollY > 50) {
        nav.style.background = 'rgba(255, 255, 255, 0.98)';
    } else {
        nav.style.background = 'rgba(255, 255, 255, 0.95)';
    }
});

// Animate progress bars on scroll
const observerOptions = {
    threshold: 0.5,
    rootMargin: '0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const progressBars = entry.target.querySelectorAll('.progress');
            progressBars.forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0';
                setTimeout(() => {
                    bar.style.width = width;
                }, 100);
            });
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

const languagesSection = document.querySelector('.languages');
if (languagesSection) {
    observer.observe(languagesSection);
}

// Fade-in animation for cards
const fadeElements = document.querySelectorAll('.project-card, .experience-card, .volunteer-card, .timeline-item');

const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '0';
            entry.target.style.transform = 'translateY(20px)';
            setTimeout(() => {
                entry.target.style.transition = 'all 0.6s ease';
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, 100);
            fadeObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1 });

fadeElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    fadeObserver.observe(el);
});

// CHAT 

const chatButton = document.getElementById('chatButton');
const chatWindow = document.getElementById('chatWindow');
const chatClose = document.getElementById('chatClose');

let userName = '';

if (chatButton) {
    chatButton.addEventListener('click', () => {
        chatWindow.classList.toggle('open');
    });
}

if (chatClose) {
    chatClose.addEventListener('click', () => {
        chatWindow.classList.remove('open');
    });
}

// Submit name
const submitNameBtn = document.getElementById('submitName');
if (submitNameBtn) {
    submitNameBtn.addEventListener('click', () => {
        userName = document.getElementById('userName').value.trim();
        if (userName === '') {
            alert('Please enter your name');
            return;
        }
        
        document.getElementById('chatNameStep').style.display = 'none';
        
        const optionsDiv = document.getElementById('chatOptions');
        optionsDiv.innerHTML = `
            <div class="chat-message bot">
                Nice to meet you, ${userName}! 👋<br><br>
                What would you like to know about?
            </div>
            <div class="chat-options">
                <button class="chat-option-btn" data-option="about">📖 About Elen</button>
                <button class="chat-option-btn" data-option="education">🎓 Education</button>
                <button class="chat-option-btn" data-option="experience">💼 Experience</button>
                <button class="chat-option-btn" data-option="projects">🚀 Projects</button>
                <button class="chat-option-btn" data-option="skills">⚙️ Skills</button>
                <button class="chat-option-btn" data-option="other">💬 Something Else</button>
            </div>
        `;
        
        document.getElementById('chatOptionsStep').style.display = 'block';
        
        document.querySelectorAll('.chat-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const option = btn.getAttribute('data-option');
                handleOption(option);
            });
        });
    });
}

async function handleOption(option) {
    const optionsDiv = document.getElementById('chatOptions');
    const customMessageDiv = document.getElementById('chatCustomMessage');
    
    const optionText = document.querySelector(`.chat-option-btn[data-option="${option}"]`)?.innerText || option;
    optionsDiv.innerHTML += `<div class="chat-message user">${optionText}</div>`;
    
    if (option === 'other') {
        customMessageDiv.style.display = 'block';
        optionsDiv.innerHTML += `
            <div class="chat-message bot">
                Great! What would you like to tell me? I'll get back to you! 💬
            </div>
        `;
        
        const submitMsgBtn = document.getElementById('submitMessage');
        if (submitMsgBtn) {
            submitMsgBtn.onclick = async () => {
                const message = document.getElementById('userMessage').value.trim();
                if (message === '') {
                    alert('Please enter your message');
                    return;
                }
                
                optionsDiv.innerHTML += `<div class="chat-message user">${message}</div>`;
                
                try {
                    const response = await fetch('/send-message', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: userName, message: message })
                    });
                    
                    if (response.ok) {
                        document.getElementById('chatOptionsStep').style.display = 'none';
                        document.getElementById('chatConfirmation').style.display = 'block';
                        
                        setTimeout(() => {
                            chatWindow.classList.remove('open');
                            resetChat();
                        }, 3000);
                    } else {
                        alert('Failed to send. Please try again.');
                    }
                } catch (error) {
                    alert('Error sending message. Check if server is running.');
                }
            };
        }
    } else {
        const optionMessages = {
            'about': "I'm a CS & Applied Mathematics student passionate about technology, IoT, and data science. I love building things that solve real problems! 🚀",
            'education': "I study at French University of Armenia and Université Paul Sabatier Toulouse III. Also taking Semiconductor Engineering at Synopsys! 📚",
            'experience': "I currently work as an ESL Teacher at Academy Polyglot, helping students improve their English skills. I love teaching! 💪",
            'projects': "Check out my projects on GitHub! I've built IoT systems, ML models, and this portfolio website. All links are on my site! 🔗",
            'skills': "I work with Python, C, Java, Flask, Git, IoT, and more. Always learning new technologies! ⚡"
        };
        
        optionsDiv.innerHTML += `
            <div class="chat-message bot">
                ${optionMessages[option] || 'Thanks for your interest! Check out my website for more details!'}
            </div>
            <div class="chat-options">
                <button class="chat-option-btn" data-option="other">💬 Send a custom message</button>
                <button class="chat-close-btn" id="closeChatBtn">🔚 End conversation</button>
            </div>
        `;
        
        try {
            await fetch('/send-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: userName, message: `Asked about: ${optionText}` })
            });
        } catch (error) {
            console.error('Error:', error);
        }
        
        document.querySelectorAll('.chat-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newOption = btn.getAttribute('data-option');
                if (newOption === 'other') {
                    handleOption('other');
                }
            });
        });
        
        const closeBtn = document.getElementById('closeChatBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('chatOptionsStep').style.display = 'none';
                document.getElementById('chatConfirmation').style.display = 'block';
                setTimeout(() => {
                    chatWindow.classList.remove('open');
                    resetChat();
                }, 2000);
            });
        }
    }
}

function resetChat() {
    setTimeout(() => {
        document.getElementById('userName').value = '';
        const userMessage = document.getElementById('userMessage');
        if (userMessage) userMessage.value = '';
        document.getElementById('chatNameStep').style.display = 'block';
        document.getElementById('chatOptionsStep').style.display = 'none';
        document.getElementById('chatConfirmation').style.display = 'none';
        document.getElementById('chatOptions').innerHTML = '';
        document.getElementById('chatCustomMessage').style.display = 'none';
    }, 500);
}