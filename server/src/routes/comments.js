const express = require('express');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// POST /api/comments - Add comment to lead
router.post('/', async (req, res) => {
  try {
    const { content, leadId } = req.body;

    if (!content || !leadId) {
      return res.status(400).json({ error: 'Content and leadId are required' });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        leadId,
        authorId: req.user.id,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ comment });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/comments/:leadId - Get all comments for a lead
router.get('/:leadId', async (req, res) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { leadId: req.params.leadId },
      include: {
        author: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ comments });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
