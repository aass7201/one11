require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const CONFIG_FILE = path.join(__dirname, 'config.json');

if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({
        systemPrompt: "You are a helpful assistant.",
        botEnabled: true,
        model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
        telegramToken: "",
        telegramChatId: "",
        errors: []
    }));
}

function getConfig() {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function logError(msg) {
    const config = getConfig();
    config.errors.unshift({ time: new Date().toISOString(), message: msg });
    if (config.errors.length > 10) config.errors.pop();
    saveConfig(config);
    console.error(msg);
}

const chatHistory = {};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.get('/api/config', (req, res) => {
    res.json(getConfig());
});

app.post('/api/config', (req, res) => {
    const { password, ...newConfig } = req.body;
    if (password !== (process.env.ADMIN_PASSWORD || 'admin')) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Wrong Password' });
    }
    
    const config = getConfig();
    config.systemPrompt = newConfig.systemPrompt;
    config.botEnabled = newConfig.botEnabled;
    config.model = newConfig.model;
    config.telegramToken = newConfig.telegramToken;
    config.telegramChatId = newConfig.telegramChatId;
    saveConfig(config);
    res.json({ success: true });
});

app.get('/webhook', (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

app.post('/webhook', async (req, res) => {
    const body = req.body;
    
    if (body.object === 'page') {
        res.status(200).send('EVENT_RECEIVED');
        
        for (const entry of body.entry) {
            const webhookEvent = entry.messaging[0];
            if (!webhookEvent) continue;
            
            const senderPsid = webhookEvent.sender.id;
            
            if (webhookEvent.message && webhookEvent.message.text) {
                await handleMessage(senderPsid, webhookEvent.message.text);
            }
        }
    } else {
        res.sendStatus(404);
    }
});

async function sendToTelegram(text) {
    const config = getConfig();
    if (!config.telegramToken || !config.telegramChatId) {
        throw new Error("تليجرام غير مجهز في الإعدادات");
    }
    
    const url = `https://api.telegram.org/bot${config.telegramToken}/sendMessage`;
    await axios.post(url, {
        chat_id: config.telegramChatId,
        text: text,
        parse_mode: 'HTML'
    });
}

async function handleMessage(senderPsid, text) {
    const config = getConfig();
    if (!config.botEnabled) return;
    
    try {
        if (!chatHistory[senderPsid]) {
            chatHistory[senderPsid] = [];
        }
        
        chatHistory[senderPsid].push({ role: 'user', content: text });
        
        let conversation = config.systemPrompt + "\n\nChat History:\n";
        for (const msg of chatHistory[senderPsid]) {
            conversation += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
        }
        conversation += "Assistant:";
        
        const response = await ai.models.generateContent({
            model: config.model || 'gemini-3.6-flash',
            contents: conversation,
            config: {
                tools: [{
                    functionDeclarations: [{
                        name: 'submit_order',
                        description: 'استخدم هذه الأداة فقط عندما يعطي الزبون تفاصيل طلبه كاملة (الطلب، العنوان، رقم الهاتف) ويكون جاهزاً للحجز.',
                        parameters: {
                            type: 'OBJECT',
                            properties: {
                                items: { type: 'STRING', description: 'تفاصيل الطلب (ماذا يريد أن يشتري والكمية)' },
                                address: { type: 'STRING', description: 'عنوان الزبون بالتفصيل' },
                                phone: { type: 'STRING', description: 'رقم هاتف الزبون' }
                            },
                            required: ['items', 'address', 'phone']
                        }
                    }]
                }]
            }
        });
        
        let replyText = response.text || "";
        
        if (response.functionCalls && response.functionCalls.length > 0) {
            const call = response.functionCalls[0];
            if (call.name === 'submit_order') {
                const { items, address, phone } = call.args;
                
                // Send to telegram
                const telegramMsg = `🆕 <b>طلب جديد من ماسنجر!</b>\n\n🛍️ <b>الطلب:</b>\n${items}\n\n📍 <b>العنوان:</b>\n${address}\n\n📱 <b>رقم الهاتف:</b>\n${phone}`;
                
                try {
                    await sendToTelegram(telegramMsg);
                    replyText = "تم تثبيت طلبك بنجاح! سيتم التواصل معك قريباً لتأكيد التوصيل. شكراً لك!";
                } catch (tError) {
                    logError("خطأ في إرسال تليجرام: " + tError.message);
                    replyText = "تم تسجيل طلبك، ولكن حدث خطأ في النظام الداخلي. سنقوم بمراجعته يدوياً.";
                }
            }
        }
        
        if (!replyText) {
             replyText = "عذراً، لم أستطع فهم ذلك. هل يمكنك التوضيح؟";
        }
        
        chatHistory[senderPsid].push({ role: 'model', content: replyText });
        
        if (chatHistory[senderPsid].length > 10) {
            chatHistory[senderPsid] = chatHistory[senderPsid].slice(chatHistory[senderPsid].length - 10);
        }
        
        await callSendAPI(senderPsid, { text: replyText });
        
    } catch (err) {
        logError("Error in handleMessage: " + err.message);
    }
}

async function callSendAPI(senderPsid, responseMsg) {
    const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
    try {
        await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
            recipient: { id: senderPsid },
            message: responseMsg
        });
    } catch (err) {
        logError("Error calling FB Send API: " + (err.response?.data?.error?.message || err.message));
    }
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
