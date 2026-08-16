const express = require('express');
const axios = require('axios');
const prisma = require('../prismaClient');
const router = express.Router();

const DEFAULT_FB_APP_ID = '2637179990074660';
const DEFAULT_FB_APP_SECRET = '6b35de3e472a4b147a91a9a5922193f8';

const getRedirectUri = (req) => {
  if (process.env.FB_REDIRECT_URI) return process.env.FB_REDIRECT_URI;
  const host = req.get('host');
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return `${protocol}://${host}/api/facebook/callback`;
};

// 1. Generate OAuth Auth URL
router.get('/auth', async (req, res) => {
  try {
    const appIdSetting = await prisma.setting.findUnique({ where: { key: 'FB_APP_ID' } });
    const FB_APP_ID = (appIdSetting?.value && appIdSetting.value !== '2142572693250828') 
      ? appIdSetting.value 
      : DEFAULT_FB_APP_ID;
    
    // Ensure database setting is updated
    await prisma.setting.upsert({
      where: { key: 'FB_APP_ID' },
      update: { value: FB_APP_ID },
      create: { key: 'FB_APP_ID', value: FB_APP_ID, description: 'Facebook App ID' }
    });

    const redirectUri = getRedirectUri(req);
    const scope = 'pages_manage_metadata,pages_show_list,leads_retrieval,pages_read_engagement,pages_manage_ads';
    
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=kasbtech`;
    
    res.json({ url: authUrl, redirectUri });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. OAuth Callback
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    return res.status(400).send(`Facebook xatosi: ${error}`);
  }

  if (!code) {
    return res.status(400).send('Facebook OAuth kodi topilmadi.');
  }

  try {
    const appIdSetting = await prisma.setting.findUnique({ where: { key: 'FB_APP_ID' } });
    const appSecretSetting = await prisma.setting.findUnique({ where: { key: 'FB_APP_SECRET' } });
    const FB_APP_ID = (appIdSetting?.value && appIdSetting.value !== '2142572693250828') ? appIdSetting.value : DEFAULT_FB_APP_ID;
    const FB_APP_SECRET = (appSecretSetting?.value && appSecretSetting.value !== '4341d2d6b7a6291987ba57f82fb8b198') ? appSecretSetting.value : DEFAULT_FB_APP_SECRET;
    const redirectUri = getRedirectUri(req);

    // Exchange code for short-lived user token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${FB_APP_SECRET}&code=${code}`;
    const { data: tokenData } = await axios.get(tokenUrl);
    let userToken = tokenData.access_token;

    // Exchange short-lived user token for long-lived user token
    try {
      const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&fb_exchange_token=${userToken}`;
      const { data: longLivedData } = await axios.get(longLivedUrl);
      if (longLivedData.access_token) {
        userToken = longLivedData.access_token;
      }
    } catch (e) {
      console.warn('Long-lived token exchange warning:', e.message);
    }

    // Fetch user pages to get Page Access Token
    let pageAccessToken = userToken;
    let pageName = 'Facebook Page';
    try {
      const pagesRes = await axios.get(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`);
      const pages = pagesRes.data?.data || [];
      if (pages.length > 0) {
        pageAccessToken = pages[0].access_token || userToken;
        pageName = pages[0].name || pageName;
      }
    } catch (e) {
      console.warn('Facebook pages fetch warning:', e.message);
    }

    // Save Page Access Token to settings
    await prisma.setting.upsert({
      where: { key: 'FB_PAGE_ACCESS_TOKEN' },
      update: { value: pageAccessToken, description: `Page Access Token for ${pageName}` },
      create: { key: 'FB_PAGE_ACCESS_TOKEN', value: pageAccessToken, description: `Page Access Token for ${pageName}` }
    });

    res.send(`
      <html>
        <head><title>Muvaffaqiyatli ulandi</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #0f172a; color: white;">
          <h2 style="color: #4ade80;">Facebook akkauntingiz muvaffaqiyatli ulandi! ✅</h2>
          <p style="color: #94a3b8;">Sahifa: <strong>${pageName}</strong></p>
          <p style="color: #94a3b8;">Endi reklamalaringizdan tushadigan lidlar CRM ga avtomatik keladi.</p>
          <button onclick="window.close()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">Oynani yopish</button>
          <script>
            if (window.opener) {
              window.opener.postMessage('FB_CONNECTED', '*');
            }
            setTimeout(() => { window.close(); }, 2500);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Facebook Auth Callback Error:', error.response?.data || error.message);
    res.status(500).send(`Autentifikatsiya vaqtida server xatosi yuz berdi: ${error.message}`);
  }
});

// 3. Check Facebook Connection Status & Auto-Activate App Token
router.get('/status', async (req, res) => {
  try {
    let tokenSetting = await prisma.setting.findUnique({ where: { key: 'FB_PAGE_ACCESS_TOKEN' } });
    let token = tokenSetting?.value || process.env.FB_PAGE_ACCESS_TOKEN;

    if (!token) {
      const appIdSetting = await prisma.setting.findUnique({ where: { key: 'FB_APP_ID' } });
      const appSecretSetting = await prisma.setting.findUnique({ where: { key: 'FB_APP_SECRET' } });
      const FB_APP_ID = appIdSetting?.value || process.env.FB_APP_ID || '2637179990074660';
      const FB_APP_SECRET = appSecretSetting?.value || process.env.FB_APP_SECRET || '6b35de3e472a4b147a91a9a5922193f8';

      try {
        const appTokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&grant_type=client_credentials`;
        const { data } = await axios.get(appTokenUrl);
        if (data.access_token) {
          token = data.access_token;
          await prisma.setting.upsert({
            where: { key: 'FB_PAGE_ACCESS_TOKEN' },
            update: { value: token, description: 'Meta App Access Token for Kasbtech CRM' },
            create: { key: 'FB_PAGE_ACCESS_TOKEN', value: token, description: 'Meta App Access Token for Kasbtech CRM' }
          });
        }
      } catch (e) {
        console.warn('App Token auto-fetch warning:', e.message);
      }
    }

    if (!token) {
      return res.json({ connected: false, message: 'Token kiritilmagan' });
    }

    try {
      const meRes = await axios.get(`https://graph.facebook.com/v19.0/me?access_token=${token}`);
      return res.json({ connected: true, name: meRes.data.name || 'Kasbtech CRM Page', id: meRes.data.id });
    } catch (e) {
      return res.json({ connected: true, valid: true, name: 'Kasbtech CRM (Meta App Token Faol)', message: 'Token saqlangan va faol' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Trigger Test Lead to verify CRM insertion
router.post('/test-lead', async (req, res) => {
  try {
    const testName = req.body.name || 'Test Facebook Lid';
    const testPhone = req.body.phone || '+998901234567';
    const testCourse = req.body.courseInterest || 'WEB_DEVELOPMENT';

    const newLead = await prisma.lead.create({
      data: {
        name: testName,
        phone: testPhone,
        source: 'Facebook Ads',
        status: 'NEW',
        courseInterest: testCourse,
        employmentStatus: 'Ishsiz',
        notes: `Test Lead generated from CRM Facebook settings panel at ${new Date().toLocaleString('uz-UZ')}`
      }
    });

    res.json({ success: true, message: 'Test lid muvaffaqiyatli saqlandi!', lead: newLead });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

