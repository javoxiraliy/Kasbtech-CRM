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

// Helper to get connected accounts list
const getAccountsList = async () => {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'FB_ACCOUNTS' } });
    if (!setting || !setting.value) return [];
    return JSON.parse(setting.value);
  } catch (e) {
    return [];
  }
};

// Helper to save connected accounts list
const saveAccountsList = async (accounts) => {
  const jsonStr = JSON.stringify(accounts);
  await prisma.setting.upsert({
    where: { key: 'FB_ACCOUNTS' },
    update: { value: jsonStr, description: 'Connected Facebook Pages and Accounts' },
    create: { key: 'FB_ACCOUNTS', value: jsonStr, description: 'Connected Facebook Pages and Accounts' }
  });
};

// 1. Generate OAuth Auth URL
router.get('/auth', async (req, res) => {
  try {
    const appIdSetting = await prisma.setting.findUnique({ where: { key: 'FB_APP_ID' } });
    let FB_APP_ID = '2637179990074660';
    if (appIdSetting?.value && appIdSetting.value.length > 5 && appIdSetting.value !== '2142572693250828') {
      FB_APP_ID = appIdSetting.value;
    }
    
    // Ensure database setting is updated
    await prisma.setting.upsert({
      where: { key: 'FB_APP_ID' },
      update: { value: FB_APP_ID },
      create: { key: 'FB_APP_ID', value: FB_APP_ID, description: 'Facebook App ID' }
    });

    const redirectUri = getRedirectUri(req);
    const scope = 'pages_manage_metadata,pages_show_list,leads_retrieval,pages_read_engagement,pages_manage_ads';
    
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=kasbtech`;
    
    res.json({ url: authUrl, redirectUri, appId: FB_APP_ID });
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

    // Fetch all user pages
    let newAccounts = [];
    try {
      const pagesRes = await axios.get(`https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`);
      const pages = pagesRes.data?.data || [];
      
      pages.forEach(p => {
        newAccounts.push({
          id: p.id || `page_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          name: p.name || 'Facebook Sahifa',
          category: p.category || 'Business Page',
          accessToken: p.access_token || userToken,
          connectedAt: new Date().toISOString(),
          status: 'ACTIVE',
          type: 'PAGE'
        });
      });
    } catch (e) {
      console.warn('Facebook pages fetch warning:', e.message);
    }

    if (newAccounts.length === 0) {
      // Fallback: Add primary user account
      try {
        const meRes = await axios.get(`https://graph.facebook.com/v19.0/me?access_token=${userToken}`);
        newAccounts.push({
          id: meRes.data.id || `user_${Date.now()}`,
          name: meRes.data.name || 'Facebook Akkaunt',
          category: 'Personal / Ad Account',
          accessToken: userToken,
          connectedAt: new Date().toISOString(),
          status: 'ACTIVE',
          type: 'USER'
        });
      } catch (e) {
        newAccounts.push({
          id: `acc_${Date.now()}`,
          name: 'Facebook Akkaunt',
          category: 'Ad Account',
          accessToken: userToken,
          connectedAt: new Date().toISOString(),
          status: 'ACTIVE',
          type: 'USER'
        });
      }
    }

    // Merge with existing accounts
    const existingList = await getAccountsList();
    const updatedList = [...existingList];
    
    newAccounts.forEach(newAcc => {
      const idx = updatedList.findIndex(a => a.id === newAcc.id || a.name === newAcc.name);
      if (idx >= 0) {
        updatedList[idx] = { ...updatedList[idx], ...newAcc };
      } else {
        updatedList.push(newAcc);
      }
    });

    await saveAccountsList(updatedList);

    // Save primary page access token
    if (updatedList.length > 0) {
      await prisma.setting.upsert({
        where: { key: 'FB_PAGE_ACCESS_TOKEN' },
        update: { value: updatedList[0].accessToken, description: `Page Access Token for ${updatedList[0].name}` },
        create: { key: 'FB_PAGE_ACCESS_TOKEN', value: updatedList[0].accessToken, description: `Page Access Token for ${updatedList[0].name}` }
      });
    }

    res.send(`
      <html>
        <head><title>Muvaffaqiyatli ulandi</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #0f172a; color: white;">
          <h2 style="color: #4ade80;">Facebook akkauntingiz muvaffaqiyatli ulandi! ✅</h2>
          <p style="color: #94a3b8;">Jami <strong>${updatedList.length} ta</strong> sahifa/akkaunt CRM-ga biriktirildi.</p>
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

// 3. GET /api/facebook/accounts - List all connected Facebook accounts & pages
router.get('/accounts', async (req, res) => {
  try {
    let accounts = await getAccountsList();
    
    // Fallback if accounts list empty but single FB_PAGE_ACCESS_TOKEN exists
    if (accounts.length === 0) {
      const tokenSetting = await prisma.setting.findUnique({ where: { key: 'FB_PAGE_ACCESS_TOKEN' } });
      const token = tokenSetting?.value;
      if (token) {
        accounts = [{
          id: 'primary_page',
          name: 'Kasbtech CRM (Meta App Token Faol)',
          category: 'Asosiy Reklama Sahifasi',
          accessToken: token,
          connectedAt: new Date().toISOString(),
          status: 'ACTIVE',
          type: 'PAGE'
        }];
        await saveAccountsList(accounts);
      }
    }

    res.json({ accounts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. POST /api/facebook/accounts - Manually add a Facebook Page/Account token
router.post('/accounts', async (req, res) => {
  try {
    const { name, accessToken, category } = req.body;
    if (!name || !accessToken) {
      return res.status(400).json({ error: 'Sahifa nomi va Access Token kiritilishi shart' });
    }

    const newAcc = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name: name.trim(),
      category: category || 'Qo\'lda ulangan reklama sahifasi',
      accessToken: accessToken.trim(),
      connectedAt: new Date().toISOString(),
      status: 'ACTIVE',
      type: 'CUSTOM'
    };

    const existing = await getAccountsList();
    const updated = [...existing, newAcc];
    await saveAccountsList(updated);

    // Save as primary token if first account
    await prisma.setting.upsert({
      where: { key: 'FB_PAGE_ACCESS_TOKEN' },
      update: { value: newAcc.accessToken, description: `Page Access Token for ${newAcc.name}` },
      create: { key: 'FB_PAGE_ACCESS_TOKEN', value: newAcc.accessToken, description: `Page Access Token for ${newAcc.name}` }
    });

    res.json({ success: true, message: 'Yangi Facebook sahifasi muvaffaqiyatli qo\'shildi!', account: newAcc, accounts: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. DELETE /api/facebook/accounts/:id - Disconnect/remove a Facebook Account/Page
router.delete('/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await getAccountsList();
    const updated = existing.filter(a => a.id !== id);
    await saveAccountsList(updated);

    // If remaining accounts exist, update primary token
    if (updated.length > 0) {
      await prisma.setting.upsert({
        where: { key: 'FB_PAGE_ACCESS_TOKEN' },
        update: { value: updated[0].accessToken, description: `Page Access Token for ${updated[0].name}` },
        create: { key: 'FB_PAGE_ACCESS_TOKEN', value: updated[0].accessToken, description: `Page Access Token for ${updated[0].name}` }
      });
    }

    res.json({ success: true, message: 'Facebook akkaunti o\'chirildi', accounts: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Check Facebook Connection Status
router.get('/status', async (req, res) => {
  try {
    const accounts = await getAccountsList();
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

    const isConnected = !!token || accounts.length > 0;
    const activeName = accounts.length > 0 ? accounts[0].name : 'Kasbtech CRM (Meta App Token Faol)';

    return res.json({ 
      connected: isConnected, 
      name: activeName, 
      accountsCount: accounts.length || (isConnected ? 1 : 0),
      accounts 
    });
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

