# PageAI - Facebook Messenger Bot with Google Gemini

هذا المشروع هو ربط بسيط جداً بين صفحة Facebook و Google Gemini للرد التلقائي على الرسائل باستخدام الذكاء الاصطناعي.

## الخطوات المطلوبة للتشغيل:

1. **إنشاء Gemini API Key:**
   - اذهب إلى [Google AI Studio](https://aistudio.google.com/app/apikey).
   - قم بإنشاء مفتاح API جديد وانسخه.

2. **إنشاء Meta App:**
   - اذهب إلى [Meta for Developers](https://developers.facebook.com/).
   - أنشئ تطبيقاً جديداً (Type: Business).
   - أضف منتج "Messenger" للتطبيق.

3. **ربط Facebook Page:**
   - في إعدادات Messenger في تطبيق Meta، قم بربط صفحة Facebook الخاصة بك.

4. **إضافة Page Access Token:**
   - بعد ربط الصفحة، قم بتوليد Token.
   - انسخ الـ Token إلى ملف `.env` باسم `PAGE_ACCESS_TOKEN`.

5. **إعداد Webhook:**
   - في إعدادات Messenger في Meta، قم بإعداد Webhook جديد.
   - Callback URL: `https://your-domain.com/webhook` (استخدم ngrok للتجربة محلياً).
   - Verify Token: ضع كلمة سر من اختيارك وضعها في `.env` باسم `VERIFY_TOKEN`.
   - حدد الاشتراك في أحداث `messages`.

6. **تشغيل المشروع:**
   - انسخ ملف `.env.example` إلى `.env` وقم بتعبئة البيانات.
   - قم بتشغيل الأمر: `npm install`
   - قم بتشغيل الأمر: `node server.js`

7. **فتح صفحة Admin:**
   - اذهب إلى `http://localhost:3000` (أو رابط الخادم الخاص بك).
   - كلمة المرور الافتراضية هي `admin` (يمكن تغييرها من `.env` `ADMIN_PASSWORD`).

8. **كتابة تعليمات البوت:**
   - اكتب التعليمات في مربع "تعليمات الذكاء الاصطناعي".
   - اضغط على "حفظ التعليمات".

9. **تشغيل الرد الآلي:**
   - تأكد من تفعيل زر "تشغيل/إيقاف" من صفحة Admin.

## النشر (Deployment)
هذا المشروع جاهز للنشر مباشرة على منصات مثل Render أو Railway.
فقط تأكد من إضافة Environment Variables المطلوبة في إعدادات المنصة.
