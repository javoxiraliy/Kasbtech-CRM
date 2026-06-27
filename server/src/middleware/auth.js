const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Sessiya mavjudligini tekshirish (qurilmalar cheklovi uchun)
    const activeSession = await prisma.deviceSession.findUnique({
      where: { token }
    });

    if (!activeSession) {
      return res.status(401).json({ error: 'Sessiya muddati tugadi yoki boshqa qurilmadan kirildi' });
    }

    // Sessiyaning oxirgi faollik vaqtini yangilash
    await prisma.deviceSession.update({
      where: { id: activeSession.id },
      data: { lastActiveAt: new Date() }
    }).catch(() => {});

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true, isActive: true, bio: true, phone: true, nickname: true, avatar: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authenticate, requireAdmin };
