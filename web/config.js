/**
 * Configuration for Web Dashboard
 * Update these settings as needed
 */

const CONFIG = {
  // Backend server URL
  SOCKET_URL: 'https://smarttile.onrender.com',
  
  // API endpoints
  API: {
    ALERT: '/api/alert',
    BUZZER_OFF: '/api/buzzer/off',
    ALERT_HISTORY: '/api/alerts/history',
    BUZZER_STATUS: '/api/buzzer/status',
  },
  
  // UI settings
  UI: {
    maxAlerts: 10,
    maxHistory: 50,
    flashDuration: 500,
    animationSpeed: 300,
  },
  
  // Theme colors
  THEME: {
    primary: '#007ACC',
    primaryDark: '#005a9e',
    primaryLight: '#1a8cd8',
    alert: '#ff1744',
    alertDark: '#d50000',
    accentGreen: '#00FF88',
    accentCyan: '#00D4FF',
  },
};

// Make config available globally
window.SMARTTILE_CONFIG = CONFIG;
