const express = require('express');
const axios = require('axios');
const prisma = require('../prismaClient'); // Assuming prisma is instantiated here
const router = express.Router();

// Meta (Facebook) Webhook verification
router.get('/meta', (req, res) => {
  const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'KASBTECH_META_WEBHOOK_SECRET_123';
  
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
  } else {
    res.status(400).send('Missing mode or token');
  }
});

// Meta (Facebook) Webhook receiving leads
router.post('/meta', async (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    res.status(200).send('EVENT_RECEIVED');

    try {
      for (const entry of body.entry) {
        if (!entry.changes) continue;

        for (const change of entry.changes) {
          if (change.field === 'leadgen') {
            const leadgen_id = change.value.leadgen_id;
            const form_id = change.value.form_id;

            console.log(`[Webhook] New LeadGen ID received: ${leadgen_id}`);

            const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
            if (!PAGE_ACCESS_TOKEN) {
              console.error('Missing FB_PAGE_ACCESS_TOKEN in env variables');
              continue;
            }

            const leadUrl = `https://graph.facebook.com/v19.0/${leadgen_id}?access_token=${PAGE_ACCESS_TOKEN}`;
            const { data } = await axios.get(leadUrl);

            // Extract fields from Meta response
            const fieldData = data.field_data || [];
            let name = 'Nomaʼlum';
            let phone = '';
            let courseInterest = 'Boshqa';
            
            for (const field of fieldData) {
              const fieldName = field.name.toLowerCase();
              const fieldValue = field.values[0] || '';
              
              if (fieldName.includes('name') || fieldName.includes('first_name') || fieldName.includes('full_name')) {
                name = fieldValue;
              } else if (fieldName.includes('phone')) {
                phone = fieldValue;
              } else if (fieldName.includes('course') || fieldName.includes('yo\'nalish')) {
                courseInterest = fieldValue;
              }
            }

            if (!phone) {
              console.warn('[Webhook] Lead has no phone number, skipping saving.');
              continue;
            }

            // Clean up phone number format if needed
            if (!phone.startsWith('+')) {
               if (phone.length === 9) {
                 phone = '+998' + phone;
               } else if (phone.length === 12 && phone.startsWith('998')) {
                 phone = '+' + phone;
               }
            }

            // Map courseInterest if possible (Optional: match to ENUM values if needed, otherwise leave as text)
            const validCourses = [
              "VIDEOGRAPHY", "VIDEO_EDITING", "SMM", "TARGET_PRO", 
              "COMPUTER_GRAPHICS", "COMPUTER_LITERACY", "GRAPHIC_DESIGN", 
              "WEB_DEVELOPMENT", "PYTHON", "AUTOCAD", "THREE_D_MAX", "OTHER"
            ];
            
            let matchedCourse = "OTHER";
            const normalizedInterest = courseInterest.toUpperCase().replace(/\s+/g, '_');
            
            if (validCourses.includes(normalizedInterest)) {
                matchedCourse = normalizedInterest;
            } else if (courseInterest.toLowerCase().includes('dasturlash')) {
                matchedCourse = "WEB_DEVELOPMENT";
            } else if (courseInterest.toLowerCase().includes('dizayn')) {
                matchedCourse = "GRAPHIC_DESIGN";
            } else if (courseInterest.toLowerCase().includes('smm')) {
                matchedCourse = "SMM";
            }

            // Check if lead already exists by leadgen_id? 
            // In Prisma schema we don't have leadgen_id field, so we just create.
            // Avoid duplicates by phone? Usually better to just save or check phone.
            const existingLead = await prisma.lead.findFirst({
              where: { phone: phone, status: 'NEW' }
            });

            if (existingLead) {
              console.log(`[Webhook] Lead with phone ${phone} already exists. Skipping.`);
              continue;
            }

            // Save to DB
            const newLead = await prisma.lead.create({
              data: {
                name,
                phone,
                source: 'Facebook Ads',
                status: 'NEW',
                courseInterest: matchedCourse,
                employmentStatus: 'Ishsiz', // Default
                notes: `Form ID: ${form_id}, LeadGen ID: ${leadgen_id}`,
              }
            });

            console.log(`[Webhook] Successfully saved lead: ${newLead.id} - ${name} (${phone})`);
          }
        }
      }
    } catch (error) {
      console.error('[Webhook] Error processing lead data:', error.response?.data || error.message);
    }
  } else {
    res.sendStatus(404);
  }
});

module.exports = router;
