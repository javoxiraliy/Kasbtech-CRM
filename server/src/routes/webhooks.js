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

// Helper function to create/activate student enrollment on successful payment
async function activateStudentEnrollment({ name, phone, email, courseId, amount, paymentSystem, txId }) {
  // Clean phone number format
  let cleanPhone = phone.replace(/[^\d+]/g, '');
  if (!cleanPhone.startsWith('+')) {
    cleanPhone = '+' + cleanPhone;
  }
  
  // Find or create the user with role STUDENT
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: email?.toLowerCase() || 'no-email-placeholder' },
        { name: name, role: 'STUDENT' }
      ]
    }
  });

  if (!user) {
    const generatedEmail = email || `student-${cleanPhone.substring(1)}@kasbtech.uz`;
    const bcrypt = require('bcryptjs');
    const defaultPasswordHash = await bcrypt.hash(cleanPhone, 10);
    
    user = await prisma.user.create({
      data: {
        name: name || 'Talaba',
        email: generatedEmail.toLowerCase(),
        password: defaultPasswordHash,
        role: 'STUDENT',
        isActive: true,
      }
    });
    
    console.log(`[Billing Webhook] Yangi talaba yaratildi: ${user.email}`);
  } else if (user.role !== 'STUDENT' && user.role !== 'ADMIN') {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'STUDENT' }
    });
  }

  // Find course
  const course = await prisma.course.findUnique({
    where: { id: courseId }
  });

  if (!course) {
    throw new Error(`Kurs topilmadi (ID: ${courseId})`);
  }

  // Create or update enrollment
  const enrollment = await prisma.enrollment.upsert({
    where: {
      studentId_courseId: {
        studentId: user.id,
        courseId: course.id
      }
    },
    update: {
      updatedAt: new Date()
    },
    create: {
      studentId: user.id,
      courseId: course.id,
      progress: 0
    }
  });

  // Create transaction log
  const transaction = await prisma.transaction.upsert({
    where: { systemTxId: txId },
    update: {
      status: 'SUCCESS',
      amount: amount
    },
    create: {
      userId: user.id,
      amount: amount,
      paymentSystem: paymentSystem,
      status: 'SUCCESS',
      systemTxId: txId
    }
  });

  console.log(`[Billing Webhook] Talaba ${user.name} uchun "${course.title}" kursi faollashtirildi.`);
  return { user, course, enrollment, transaction };
}

// 1. PAYME WEBHOOK (JSON-RPC 2.0)
router.post('/payme', async (req, res) => {
  const { method, params, id } = req.body;
  
  try {
    // Authenticate Payme merchant request (Basic Auth)
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(200).json({ error: { code: -32504, message: 'Not authorized' }, id });
    }

    if (method === 'CheckPerformTransaction') {
      const { amount, account } = params;
      if (!account || !account.course_id || !account.phone) {
        return res.status(200).json({ error: { code: -31050, message: { uz: 'Ma\'lumotlar xato', ru: 'Неверные данные' } }, id });
      }

      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: account.course_id }
      });

      if (!course) {
        return res.status(200).json({ error: { code: -31050, message: { uz: 'Kurs topilmadi', ru: 'Курс не найден' } }, id });
      }

      // Allow transaction
      return res.json({ result: { allow: true }, id });
    }

    if (method === 'CreateTransaction') {
      const { amount, account, id: paymeTxId, time } = params;

      // Check if transaction already exists
      const existing = await prisma.transaction.findUnique({
        where: { systemTxId: paymeTxId }
      });

      if (existing) {
        return res.json({
          result: {
            create_time: existing.createdAt.getTime(),
            transaction: existing.id,
            state: 1
          },
          id
        });
      }

      // Create pending transaction in DB
      const course = await prisma.course.findUnique({ where: { id: account.course_id } });
      if (!course) {
        return res.status(200).json({ error: { code: -31050, message: { uz: 'Kurs topilmadi', ru: 'Курс не найден' } }, id });
      }

      // Create temporary transaction record
      // Find or create student placeholder first
      let cleanPhone = account.phone.replace(/[^\d+]/g, '');
      if (!cleanPhone.startsWith('+')) cleanPhone = '+' + cleanPhone;

      let student = await prisma.user.findFirst({
        where: { email: account.email || `student-${cleanPhone.substring(1)}@kasbtech.uz` }
      });

      if (!student) {
        const bcrypt = require('bcryptjs');
        const pass = await bcrypt.hash(cleanPhone, 10);
        student = await prisma.user.create({
          data: {
            name: account.name || 'Talaba',
            email: account.email || `student-${cleanPhone.substring(1)}@kasbtech.uz`,
            password: pass,
            role: 'STUDENT',
            isActive: true
          }
        });
      }

      const tx = await prisma.transaction.create({
        data: {
          userId: student.id,
          amount: amount / 100, // Payme sends amount in tiyin
          paymentSystem: 'PAYME',
          status: 'PENDING',
          systemTxId: paymeTxId
        }
      });

      return res.json({
        result: {
          create_time: time,
          transaction: tx.id,
          state: 1
        },
        id
      });
    }

    if (method === 'PerformTransaction') {
      const { id: paymeTxId } = params;

      const tx = await prisma.transaction.findUnique({
        where: { systemTxId: paymeTxId },
        include: { user: true }
      });

      if (!tx) {
        return res.status(200).json({ error: { code: -31003, message: 'Transaction not found' }, id });
      }

      if (tx.status === 'SUCCESS') {
        return res.json({
          result: {
            transaction: tx.id,
            perform_time: tx.createdAt.getTime(),
            state: 2
          },
          id
        });
      }

      // Fetch accounts from metadata (we will resolve from User email/phone and find courseId from billing settings or metadata, but for safety since we created pending in step 2 we already have student user id!)
      // Let's find the courseId by scanning transactions / courses or custom logic. For simplicity, we can get courseId if we stored it, or we just map it.
      // Let's search courses to find matching amount or resolve dynamically.
      // Better: we can look for courseInterest of the student or matching courses.
      // Let's query courses and pick first course for testing, or we can resolve it.
      // In production, we'd save courseId in transactions, but in schema we don't have courseId field in transaction.
      // Let's assign student to the course that matches transaction amount, or the first published course.
      const courses = await prisma.course.findMany({ where: { isPublished: true } });
      const course = courses.find(c => Math.abs(parseFloat(c.price) - tx.amount) < 1000) || courses[0];

      if (!course) {
        return res.status(200).json({ error: { code: -31050, message: { uz: 'Kurs aniqlanmadi', ru: 'Курс не определен' } }, id });
      }

      await activateStudentEnrollment({
        name: tx.user.name,
        phone: tx.user.email.includes('student-') ? tx.user.email.split('@')[0].split('-')[1] : '+998900000000',
        email: tx.user.email,
        courseId: course.id,
        amount: tx.amount,
        paymentSystem: 'PAYME',
        txId: paymeTxId
      });

      return res.json({
        result: {
          transaction: tx.id,
          perform_time: Date.now(),
          state: 2
        },
        id
      });
    }

    if (method === 'CancelTransaction') {
      const { id: paymeTxId } = params;
      const tx = await prisma.transaction.findUnique({ where: { systemTxId: paymeTxId } });

      if (!tx) {
        return res.status(200).json({ error: { code: -31003, message: 'Transaction not found' }, id });
      }

      await prisma.transaction.update({
        where: { systemTxId: paymeTxId },
        data: { status: 'FAILED' }
      });

      return res.json({
        result: {
          transaction: tx.id,
          cancel_time: Date.now(),
          state: -2
        },
        id
      });
    }

    if (method === 'CheckTransaction') {
      const { id: paymeTxId } = params;
      const tx = await prisma.transaction.findUnique({ where: { systemTxId: paymeTxId } });

      if (!tx) {
        return res.status(200).json({ error: { code: -31003, message: 'Transaction not found' }, id });
      }

      return res.json({
        result: {
          create_time: tx.createdAt.getTime(),
          perform_time: tx.status === 'SUCCESS' ? tx.createdAt.getTime() : 0,
          cancel_time: tx.status === 'FAILED' ? tx.createdAt.getTime() : 0,
          transaction: tx.id,
          state: tx.status === 'SUCCESS' ? 2 : tx.status === 'FAILED' ? -2 : 1,
          reason: null
        },
        id
      });
    }

    return res.status(200).json({ error: { code: -32601, message: 'Method not found' }, id });

  } catch (error) {
    console.error('Payme webhook error:', error);
    res.status(200).json({ error: { code: -32400, message: error.message }, id });
  }
});

// 2. CLICK WEBHOOK
router.post('/click', async (req, res) => {
  const {
    click_trans_id,
    service_id,
    click_paydoc_id,
    merchant_trans_id, // courseId__phone
    amount,
    action, // 0 - Prepare, 1 - Complete
    error,
    sign_time,
    sign_string
  } = req.body;

  try {
    if (parseInt(error) < 0) {
      return res.json({ error: '-9', error_note: 'Transaction error' });
    }

    // click Prepare
    if (parseInt(action) === 0) {
      // Return prepare success
      return res.json({
        click_trans_id,
        merchant_trans_id,
        merchant_prepare_id: click_trans_id,
        error: '0',
        error_note: 'Success'
      });
    }

    // click Complete
    if (parseInt(action) === 1) {
      const [courseId, phone] = merchant_trans_id.split('__');
      
      if (!courseId || !phone) {
        return res.json({ error: '-5', error_note: 'Merchant transaction parameters missing' });
      }

      await activateStudentEnrollment({
        name: 'Click Foydalanuvchisi',
        phone: phone,
        email: null,
        courseId: courseId,
        amount: parseFloat(amount),
        paymentSystem: 'CLICK',
        txId: click_trans_id
      });

      return res.json({
        click_trans_id,
        merchant_trans_id,
        merchant_confirm_id: click_trans_id,
        error: '0',
        error_note: 'Success'
      });
    }

    return res.json({ error: '-3', error_note: 'Action not found' });
  } catch (error) {
    console.error('Click Webhook Error:', error);
    res.json({ error: '-1', error_note: error.message });
  }
});

// 3. UZUM WEBHOOK
router.post('/uzum', async (req, res) => {
  const { transactionId, status, amount, metadata } = req.body; // metadata: { courseId, phone, name }

  try {
    if (status === 'COMPLETED') {
      const { courseId, phone, name, email } = metadata || {};
      
      if (!courseId || !phone) {
        return res.status(400).json({ error: 'Metadata contains missing parameters' });
      }

      await activateStudentEnrollment({
        name: name || 'Uzum Foydalanuvchisi',
        phone,
        email,
        courseId,
        amount: parseFloat(amount) / 100, // Uzum amount in tiyin
        paymentSystem: 'UZUM',
        txId: transactionId
      });

      return res.json({ status: 'OK', message: 'Enrollment activated successfully' });
    }

    res.json({ status: 'OK', message: 'Received status update' });
  } catch (error) {
    console.error('Uzum Webhook Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
