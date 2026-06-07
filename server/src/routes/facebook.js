const express = require('express');
const axios = require('axios');
const prisma = require('../prismaClient'); // Assuming prismaClient is correctly exported
const router = express.Router();

// Ilova kalitlari (.env dan olinadi yoki to'g'ridan-to'g'ri berilgan bo'ladi)
const FB_APP_ID = process.env.FB_APP_ID || '2142572693250828';
const FB_APP_SECRET = process.env.FB_APP_SECRET || '4341d2d6b7a6291987ba57f82fb8b198';
// Callback URL (Renderdagi API manzili, o'zgarishi mumkin)
const FB_REDIRECT_URI = process.env.FB_REDIRECT_URI || 'https://kasbtech-crm.onrender.com/api/facebook/callback';

// 1. Frontend uchun Facebook Avtorizatsiya URL manzilini yaratib berish
router.get('/auth', (req, res) => {
  // Qaysi huquqlar (ruxsatlar) so'ralayotgani:
  const scope = 'pages_manage_metadata,pages_show_list,leads_retrieval,pages_read_engagement,pages_manage_ads';
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(FB_REDIRECT_URI)}&scope=${scope}&state=kasbtech`;
  
  res.json({ url: authUrl });
});

// 2. Foydalanuvchi ruxsat bergandan so'ng Facebook qaytarib yuboradigan Callback manzil
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;
  
  if (error) {
    return res.status(400).send(`Xatolik yuz berdi: ${error}`);
  }

  if (!code) {
    return res.status(400).send('Facebook tasdiqlash kodi topilmadi.');
  }

  try {
    // Facebook 'code' ni haqiqiy 'Access Token' ga almashtirish
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(FB_REDIRECT_URI)}&client_secret=${FB_APP_SECRET}&code=${code}`;
    
    const { data } = await axios.get(tokenUrl);
    const accessToken = data.access_token;
    
    // Olingan kalitni ma'lumotlar bazasiga (Setting jadvaliga) saqlash
    await prisma.setting.upsert({
      where: { key: 'FB_PAGE_ACCESS_TOKEN' },
      update: { value: accessToken },
      create: { 
        key: 'FB_PAGE_ACCESS_TOKEN', 
        value: accessToken, 
        description: 'Facebook OAuth Page Access Token for Leads' 
      }
    });

    // Muvaffaqiyatli saqlangach, CRM sahifasiga qaytarish yoki oynani yopish
    res.send(`
      <html>
        <head><title>Muvaffaqiyatli ulandi</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: green;">Facebook akkauntingiz muvaffaqiyatli ulandi! ✅</h2>
          <p>Endi reklamalaringizdan lidlar CRM ga to'g'ridan-to'g'ri tushadi.</p>
          <button onclick="window.close()" style="padding: 10px 20px; background: #0088cc; color: white; border: none; border-radius: 5px; cursor: pointer;">Oynani yopish</button>
          <script>
             setTimeout(() => { window.close(); }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Facebook Auth Error:', error.response?.data || error.message);
    res.status(500).send('Autentifikatsiya vaqtida server xatosi yuz berdi.');
  }
});

module.exports = router;
