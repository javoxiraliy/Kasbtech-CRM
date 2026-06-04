# Kasbtech CRM - Deploy Qilish Qo'llanmasi

Ushbu qo'llanma orqali **Kasbtech CRM** loyihasini bepul serverlarga to'liq joylashtirishingiz (deploy qilishingiz) mumkin.

Loyihamiz **Fullstack** bo'lganligi sababli bizga quyidagilar kerak bo'ladi:
1. **Ma'lumotlar bazasi (PostgreSQL)** — [Neon.tech](https://neon.tech/) yoki [Supabase.com](https://supabase.com/) orqali (bepul).
2. **Server va Interfeys (Backend + Frontend)** — [Render.com](https://render.com/) orqali (bepul).

---

## 1-Qadam: Ma'lumotlar Bazasi (PostgreSQL) Sozlash
Agar sizda hali bazaning ulanish havolasi (DATABASE_URL) bo'lmasa:

1. [Neon.tech](https://neon.tech/) saytidan ro'yxatdan o'ting.
2. Yangi loyiha yarating (nomini masalan `kasbtech-crm` qo'ying).
3. Sizga berilgan **Connection String** (ulanish havolasi)ni nusxalab oling. U quyidagicha ko'rinishda bo'ladi:
   `postgresql://username:password@ep-cool-shadow-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require`
4. Ushbu havolani eslab qoling, uni Render-da `DATABASE_URL` o'zgaruvchisiga yozamiz.

*(Eslatma: Hozirgi loyihangizda Supabase-dagi PostgreSQL bazasi ulangan va u faol holatda. Agar yangi baza ochishni xohlamasangiz, o'sha bazadan ham foydalanishda davom etishingiz mumkin).*

---

## 2-Qadam: Render.com-ga Deploy Qilish (Tavsiya etiladi - Bepul)
Bu usulda Render.com ham backendni ishga tushiradi, ham frontendni (React) build qilib, bitta havola ostida taqdim etadi.

1. [Render.com](https://render.com/) saytiga kiring va GitHub orqali ro'yxatdan o'ting.
2. Boshqaruv panelida **New +** tugmasini bosing va **Web Service** ni tanlang.
3. GitHub-dagi **Kasbtech-CRM** repozitoriyangizni ulang.
4. Quyidagi sozlamalarni kiriting:
   * **Name:** `kasbtech-crm` (yoki o'zingiz xohlagan nom)
   * **Region:** `Frankfurt (EU)` yoki o'zingizga yaqin hudud
   * **Branch:** `main`
   * **Runtime:** `Node`
   * **Build Command:** `npm run install-all && npm run build`
   * **Start Command:** `npm start`
5. Sahifaning pastki qismidagi **Advanced** tugmasini bosing va **Environment Variables** (Muhit o'zgaruvchilari) bo'limiga quyidagilarni qo'shing:
   * `DATABASE_URL` = *(Sizning PostgreSQL ulanish havolangiz)*
   * `JWT_SECRET` = `kasbtech_crm_secret_key_2026` *(yoki boshqa maxfiy kalit)*
   * `NODE_ENV` = `production`
6. **Deploy Web Service** tugmasini bosing.

Render loyihangizni yuklab oladi, paketlarni o'rnatadi, React-ni build qiladi va ishga tushiradi. Deploy tugagach, sizga `https://kasbtech-crm.onrender.com` kabi havola beriladi.

---

## 3-Qadam: Vercel + Render (Alohida deploy qilish)
Agar frontendni alohida **Vercel**-da tezroq yuklanishi uchun joylashtirib, backendni alohida **Render**-ga qo'ymoqchi bo'lsangiz:

### A. Backend (Render.com-da)
1. **New Web Service** ochasiz.
2. **Root Directory** qismiga `server` deb yozasiz.
3. **Build Command:** `npm install && npx prisma generate`
4. **Start Command:** `npm start`
5. **Environment Variables:**
   * `DATABASE_URL` = *(PostgreSQL ulanish havolasi)*
   * `JWT_SECRET` = *(Maxfiy kalit)*
   * `FRONTEND_URL` = `https://sizning-saytingiz.vercel.app` *(Vercel-dagi frontend manzili)*

### B. Frontend (Vercel-da)
1. [Vercel.com](https://vercel.com/) saytiga kirib, GitHub loyihangizni import qilasiz.
2. Sozlamalarda **Root Directory** bo'limini `client` qilib belgilaysiz.
3. **Environment Variables** bo'limiga qo'shasiz:
   * `VITE_API_URL` = `https://sizning-backend-servisingiz.onrender.com/api`
4. **Deploy** tugmasini bosasiz.

---

## Foydalanish va Yangiliklar
Loyihangiz serverga muvaffaqiyatli joylashgandan so'ng, siz xohlagan yangilik va funksiyalarni kodga kiritib, GitHub-ga push qilsangiz kifoya. Render yoki Vercel avtomatik ravishda yangi o'zgarishlarni tortib olib, serveringizni yangilaydi (Auto-deploy).
