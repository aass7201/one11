let currentPassword = '';

document.getElementById('loginBtn').addEventListener('click', async () => {
    const pwd = document.getElementById('adminPassword').value;
    if (!pwd) return;
    
    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pwd })
        });
        
        if (res.ok) {
            currentPassword = pwd;
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('mainContent').style.display = 'block';
            loadConfig();
        } else {
            document.getElementById('loginError').innerText = 'كلمة المرور غير صحيحة';
        }
    } catch (err) {
        document.getElementById('loginError').innerText = 'حدث خطأ في الاتصال';
    }
});

async function loadConfig() {
    try {
        const res = await fetch('/api/config');
        const config = await res.json();
        
        document.getElementById('systemPrompt').value = config.systemPrompt || '';
        document.getElementById('botEnabledToggle').checked = config.botEnabled;
        document.getElementById('modelSelect').value = config.model || 'gemini-1.5-flash';
        document.getElementById('geminiApiKey').value = config.geminiApiKey ? '***مخفي***' : '';
        
        // Telegram Fields
        document.getElementById('telegramToken').value = config.telegramToken || '';
        document.getElementById('telegramChatId').value = config.telegramChatId || '';
        
        // Render errors
        const errContainer = document.getElementById('errorsContainer');
        errContainer.innerHTML = '';
        if (config.errors && config.errors.length > 0) {
            config.errors.forEach(err => {
                const div = document.createElement('div');
                div.className = 'log-entry';
                div.innerHTML = `<span class="log-time">[${new Date(err.time).toLocaleTimeString()}]</span> ${err.message}`;
                errContainer.appendChild(div);
            });
        } else {
            errContainer.innerHTML = '<div class="log-entry">لا توجد أخطاء حالياً.</div>';
        }

        document.getElementById('dotFb').classList.add('connected');
        document.getElementById('dotGemini').classList.add('connected');
        document.getElementById('dotWebhook').classList.add('connected');
        
    } catch (err) {
        console.error('Error loading config:', err);
    }
}

async function saveAllConfig(statusElementId) {
    const systemPrompt = document.getElementById('systemPrompt').value;
    const botEnabled = document.getElementById('botEnabledToggle').checked;
    const model = document.getElementById('modelSelect').value;
    const geminiApiKey = document.getElementById('geminiApiKey').value.includes('مخفي') ? '' : document.getElementById('geminiApiKey').value;
    const telegramToken = document.getElementById('telegramToken').value;
    const telegramChatId = document.getElementById('telegramChatId').value;
    
    const saveStatus = document.getElementById(statusElementId);
    saveStatus.innerText = 'جاري الحفظ...';
    saveStatus.style.color = 'var(--success)';
    
    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                password: currentPassword,
                systemPrompt,
                botEnabled,
                model,
                geminiApiKey,
                telegramToken,
                telegramChatId
            })
        });
        
        if (res.ok) {
            saveStatus.innerText = 'تم الحفظ بنجاح ✓';
            setTimeout(() => { saveStatus.innerText = ''; }, 3000);
        } else {
            saveStatus.innerText = 'خطأ في الحفظ!';
            saveStatus.style.color = 'var(--error)';
        }
    } catch (err) {
        saveStatus.innerText = 'فشل الاتصال!';
        saveStatus.style.color = 'var(--error)';
    }
}

document.getElementById('saveBtn').addEventListener('click', () => saveAllConfig('saveStatus'));
document.getElementById('saveTelegramBtn').addEventListener('click', () => saveAllConfig('saveTelegramStatus'));

// Auto refresh errors every 10 seconds
setInterval(() => {
    if (currentPassword) {
        loadConfig();
    }
}, 10000);
