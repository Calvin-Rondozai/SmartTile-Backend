document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
    // Add input animations
    [usernameInput, passwordInput].forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.querySelector('.input-line').style.width = '100%';
        });
        
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentElement.querySelector('.input-line').style.width = '0';
            }
        });
    });
    
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        
        // Simple authentication (in production, use proper auth)
        if (username && password) {
            // Store user info
            sessionStorage.setItem('user', JSON.stringify({
                username: username,
                loginTime: new Date().toISOString()
            }));
            
            // Professional success feedback
            const btn = loginForm.querySelector('.login-btn');
            btn.disabled = true;
            const prevText = btn.querySelector('span')?.textContent || '';
            const label = btn.querySelector('span');
            if (label) label.textContent = 'Login successful';
            btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
            btn.style.transform = 'scale(0.98)';
            
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 550);
        } else {
            // Shake animation for error
            loginForm.style.animation = 'shake 0.5s';
            setTimeout(() => {
                loginForm.style.animation = '';
            }, 500);
        }
    });
    
    // Add shake animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
        }
    `;
    document.head.appendChild(style);
});
