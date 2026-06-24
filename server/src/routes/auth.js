const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

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

    // Qurilmalar sonini cheklash (maksimum 2 ta faol sessiya)
    const activeSessions = await prisma.deviceSession.findMany({
      where: { userId: user.id },
      orderBy: { lastActiveAt: 'asc' }
    });

    if (activeSessions.length >= 2) {
      // Eng eski sessiyani o'chirish
      const oldestSession = activeSessions[0];
      await prisma.deviceSession.delete({
        where: { id: oldestSession.id }
      });
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

module.exports = router;
