// Socket.IO connection
const SOCKET_URL = window.SMARTTILE_CONFIG?.SOCKET_URL || 'http://localhost:5000';
const socket = io(SOCKET_URL);

// State
let alerts = [];          // recent active alerts
let buzzerActive = false;
let isMuted = false;
let alertHistory = [];    // all alerts (history)
let isVoiceActive = false;

// DOM Elements
const connectionStatus = document.getElementById('connectionStatus');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const alertFeed = document.getElementById('alertFeed');
const alertCount = document.getElementById('alertCount');
const buzzerBtn = document.getElementById('buzzerBtn');
const muteToggle = document.getElementById('muteToggle');
const historyList = document.getElementById('historyList');
const historyContent = document.getElementById('historyContent');
const collapseBtn = document.getElementById('collapseBtn');
const historyHeader = document.getElementById('historyHeader');
const userName = document.getElementById('userName');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load user info
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    if (user.username) {
        userName.textContent = user.username;
    } else {
        window.location.href = 'index.html';
    }
    
    // Load alert history
    loadAlertHistory();
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup Socket.IO
    setupSocketIO();
});

function setupEventListeners() {
    // Buzzer button
    buzzerBtn.addEventListener('click', turnOffBuzzer);
    
    // Mute toggle
    muteToggle.addEventListener('change', (e) => {
        isMuted = e.target.checked;
        if (isMuted) {
            stopVoiceAlertLoop();
        } else if (alerts.length > 0) {
            startVoiceAlertLoop();
        }
    });
    
    // History collapse
    historyHeader.addEventListener('click', () => {
        historyContent.classList.toggle('collapsed');
        collapseBtn.classList.toggle('collapsed');
    });
    
    // Logout
    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('user');
        window.location.href = 'index.html';
    });
}

function setupSocketIO() {
    // Connection status
    socket.on('connect', () => {
        statusIndicator.classList.add('connected');
        statusText.textContent = 'Connected';
        console.log('Connected to server');
    });
    
    socket.on('disconnect', () => {
        statusIndicator.classList.remove('connected');
        statusText.textContent = 'Disconnected';
        console.log('Disconnected from server');
    });
    
    socket.on('connection_status', (data) => {
        if (data.buzzer_active) {
            buzzerActive = true;
            buzzerBtn.classList.add('active');
        }
    });
    
    // New alert
    socket.on('new_alert', (alert) => {
        handleNewAlert(alert);
    });
    
    // Buzzer off
    socket.on('buzzer_off', () => {
        buzzerActive = false;
        buzzerBtn.classList.remove('active');
        // Move active alerts out of recent (they are already in history)
        alerts = [];
        updateAlertCount();
        renderAlerts();
        stopVoiceAlertLoop();
    });
    
    // Alert history
    socket.on('alert_history', (data) => {
        if (data.alerts && data.alerts.length > 0) {
            alertHistory = data.alerts;
            renderHistory();
        }
    });
}

function handleNewAlert(alert) {
    alerts.unshift(alert);
    alertHistory.push(alert);
    
    // Update UI
    updateAlertCount();
    renderAlerts();
    renderHistory();
    
    // Flash effect
    if (!isMuted) {
        flashAlert();
    }
    // Start voice alert loop
    if (!isMuted) {
        startVoiceAlertLoop();
    }
    
    // Activate buzzer button
    if (!buzzerActive) {
        buzzerActive = true;
        buzzerBtn.classList.add('active');
    }
}

function flashAlert() {
    // Flash the entire page red
    const flash = document.createElement('div');
    flash.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 23, 68, 0.3);
        z-index: 9999;
        pointer-events: none;
        animation: flashFade 0.5s ease-out;
    `;
    document.body.appendChild(flash);
    
    setTimeout(() => {
        flash.remove();
    }, 500);
    
    // Add flash animation
    if (!document.getElementById('flashStyle')) {
        const style = document.createElement('style');
        style.id = 'flashStyle';
        style.textContent = `
            @keyframes flashFade {
                0% { opacity: 0.8; }
                100% { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}

function renderAlerts() {
    if (alerts.length === 0) {
        alertFeed.innerHTML = `
            <div class="no-alerts">
                <div class="no-alerts-icon" aria-hidden="true">
                    <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                        <path d="M4 12a8 8 0 0 1 16 0" stroke="currentColor" stroke-width="2" opacity="0.8"></path>
                        <path d="M7 12a5 5 0 0 1 10 0" stroke="currentColor" stroke-width="2" opacity="0.6"></path>
                        <path d="M10 12a2 2 0 0 1 4 0" stroke="currentColor" stroke-width="2" opacity="0.5"></path>
                        <circle cx="12" cy="16" r="1.5" fill="currentColor"></circle>
                    </svg>
                </div>
                <p>Waiting for alerts…</p>
            </div>
        `;
        return;
    }
    
    // Show only recent 10 alerts
    const recentAlerts = alerts.slice(0, 10);
    
    alertFeed.innerHTML = recentAlerts.map(alert => `
        <div class="alert-item">
            <div class="alert-header">
                <span class="alert-type">${alert.type}</span>
                <span class="alert-time">${formatTime(alert.timestamp)}</span>
            </div>
            <div class="alert-details">
                Distance: <span class="alert-distance">${alert.distance} cm</span>
                ${alert.sensor_reading !== 'N/A' ? ` | ${alert.sensor_reading}` : ''}
                ${alert.location ? ` | ${alert.location}` : ''}
            </div>
        </div>
    `).join('');
}

function renderHistory() {
    if (alertHistory.length === 0) {
        historyList.innerHTML = '<div class="no-history">No alerts yet</div>';
        return;
    }
    
    // Show all history items
    historyList.innerHTML = alertHistory.slice().reverse().map(alert => `
        <div class="history-item">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <strong>${alert.type}</strong>
                <span style="color: var(--text-secondary); font-size: 0.85rem;">${formatTime(alert.timestamp)}</span>
            </div>
            <div style="color: var(--text-secondary); font-size: 0.9rem;">
                Distance: ${alert.distance} cm
                ${alert.location ? ` | ${alert.location}` : ''}
            </div>
        </div>
    `).join('');
}

function updateAlertCount() {
    alertCount.textContent = alerts.length;
    alertCount.style.animation = 'none';
    setTimeout(() => {
        alertCount.style.animation = 'countPulse 0.5s ease-out';
    }, 10);
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function turnOffBuzzer() {
    // Animate button
    buzzerBtn.style.transform = 'scale(0.9)';
    setTimeout(() => {
        buzzerBtn.style.transform = '';
    }, 200);
    
    // Send request to server
    const API_URL = window.SMARTTILE_CONFIG?.SOCKET_URL || 'http://localhost:5000';
    fetch(`${API_URL}/api/buzzer/off`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('Buzzer turned off:', data);
        buzzerActive = false;
        buzzerBtn.classList.remove('active');
    })
    .catch(error => {
        console.error('Error turning off buzzer:', error);
    });
}

function loadAlertHistory() {
    const API_URL = window.SMARTTILE_CONFIG?.SOCKET_URL || 'http://localhost:5000';
    fetch(`${API_URL}/api/alerts/history`)
        .then(response => response.json())
        .then(data => {
            if (data.alerts) {
                // All existing alerts go to history; recent starts empty
                alertHistory = data.alerts;
                alerts = [];
                renderAlerts();
                renderHistory();
                updateAlertCount();
            }
        })
        .catch(error => {
            console.error('Error loading alert history:', error);
        });
}

// Voice alert helpers (browser speaks "Alert! Alert! Alert!" until silenced)
function hasActiveAlerts() {
    return alerts.length > 0;
}

function startVoiceAlertLoop() {
    if (!('speechSynthesis' in window)) return;
    if (isMuted) return;

    isVoiceActive = true;

    // If already speaking, let the current loop finish
    if (window.speechSynthesis.speaking) return;

    const speak = () => {
        if (!isVoiceActive || isMuted || !hasActiveAlerts()) return;

        const utterance = new SpeechSynthesisUtterance('Alert! Alert! Alert!');
        utterance.rate = 1.0;
        utterance.pitch = 1.1;

        utterance.onend = () => {
            if (isVoiceActive && !isMuted && hasActiveAlerts()) {
                setTimeout(speak, 300);
            }
        };

        window.speechSynthesis.speak(utterance);
    };

    speak();
}

function stopVoiceAlertLoop() {
    isVoiceActive = false;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
}

// Request history on connect
socket.on('connect', () => {
    socket.emit('request_history');
});
