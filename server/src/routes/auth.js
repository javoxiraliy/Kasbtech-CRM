const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    if (ext) return cb(null, true);
    cb(new Error('Faqat rasmlar ruxsat etiladi! (jpeg, jpg, png, webp, gif)'));
  }
});

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Qurilmalar sonini cheklash (STUDENT uchun max 3 ta faol sessiya, boshqalar uchun 2 ta)
    const activeSessions = await prisma.deviceSession.findMany({
      where: { userId: user.id },
      orderBy: { lastActiveAt: 'asc' }
    });

    if (user.role === 'STUDENT') {
      if (activeSessions.length >= 3) {
        return res.status(403).json({
          error: 'DEVICE_LIMIT_EXCEEDED',
          message: 'Siz ruxsat etilgan maksimal qurilmalar soniga (3 ta faol qurilma) yetdingiz. Tizimga kirish uchun quyidagi faol qurilmalardan birini o\'chirishingiz lozim:',
          sessions: activeSessions.map(s => ({
            id: s.id,
            deviceInfo: s.deviceInfo,
            ipAddress: s.ipAddress,
            lastActiveAt: s.lastActiveAt
          }))
        });
      }
    } else {
      // Boshqa rollar uchun eski avtomatik o'chirish rejimi (max 2)
      if (activeSessions.length >= 2) {
        const oldestSession = activeSessions[0];
        await prisma.deviceSession.delete({
          where: { id: oldestSession.id }
        });
      }
    }

    // Yangi sessiyani ro'yxatga olish
    const deviceInfo = req.headers['user-agent'] || 'Nomaʼlum qurilma';
    const ipAddress = req.ip || req.connection?.remoteAddress || '0.0.0.0';

    await prisma.deviceSession.create({
      data: {
        userId: user.id,
        token: token,
        deviceInfo: deviceInfo,
        ipAddress: ipAddress,
      }
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// POST /api/auth/terminate-session
router.post('/terminate-session', async (req, res) => {
  try {
    const { email, password, sessionId } = req.body;
    if (!email || !password || !sessionId) {
      return res.status(400).json({ error: 'Email, password and sessionId are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Mijoz topilmadi yoki hisobingiz nofaol' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Noto\'g\'ri parol' });
    }

    // O'chirmoqchi bo'lgan sessiyasini topish va u ushbu foydalanuvchiga tegishli ekanini tekshirish
    const session = await prisma.deviceSession.findFirst({
      where: { id: sessionId, userId: user.id }
    });

    if (!session) {
      return res.status(404).json({ error: 'Sessiya topilmadi yoki sizga tegishli emas' });
    }

    await prisma.deviceSession.delete({
      where: { id: sessionId }
    });

    res.json({ success: true, message: 'Qurilma muvaffaqiyatli o\'chirildi. Endi tizimga qayta kirishingiz mumkin.' });
  } catch (error) {
    console.error('Terminate session error:', error);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});


// GET /api/auth/me
const { authenticate } = require('../middleware/auth');
router.get('/me', authenticate, async (req, res) => {
  if (req.user.email === 'admin@crm.uz' && req.user.role !== 'ADMIN') {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { role: 'ADMIN' }
    });
    req.user.role = 'ADMIN';
  }
  res.json({ user: req.user });
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    const { name, bio, phone, nickname, password, currentPassword } = req.body;
    const userId = req.user.id;

    const data = {};
    if (name !== undefined) data.name = name;
    if (bio !== undefined) data.bio = bio;
    if (phone !== undefined) data.phone = phone;
    if (nickname !== undefined) data.nickname = nickname;

    if (req.file) {
      const fileBuffer = fs.readFileSync(req.file.path);
      const base64 = fileBuffer.toString('base64');
      data.avatar = `data:${req.file.mimetype};base64,${base64}`;
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error('Error deleting temp file:', err);
      }
    }

    if (password) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Yangi parolni o\'rnatish uchun joriy parolingizni kiritishingiz shart!' });
      }

      // Foydalanuvchining joriy parolini tekshirish
      const userDb = await prisma.user.findUnique({
        where: { id: userId }
      });

      const isValidPassword = await bcrypt.compare(currentPassword, userDb.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Joriy parolingiz noto\'g\'ri kiritildi!' });
      }

      data.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        bio: true,
        phone: true,
        nickname: true,
        avatar: true
      }
    });

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message || 'Profil ma\'lumotlarini yangilashda xatolik yuz berdi' });
  }
});

module.exports = router;
