const express = require('express');
const prisma = require('../prismaClient');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/settings - Get all settings
router.get('/', async (req, res) => {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key] = { value: s.value, description: s.description };
    });
    res.json({ settings: settingsMap });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/settings/:key - Update setting (admin only)
router.patch('/:key', requireAdmin, async (req, res) => {
  try {
    const { value, description } = req.body;

    const setting = await prisma.setting.upsert({
      where: { key: req.params.key },
      update: { value, description },
      create: { key: req.params.key, value, description },
    });

    res.json({ setting });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
