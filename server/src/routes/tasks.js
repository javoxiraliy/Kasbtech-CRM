const express = require('express');
const prisma = require('../prismaClient');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ================= ADMIN ENDPOINTS =================

// GET /api/tasks/admin - Get sent tasks list with progress details (grouped)
router.get('/admin', authenticate, requireAdmin, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Grouping tasks by title, description and exact creation timestamp
    const groups = {};
    tasks.forEach(t => {
      const timeKey = t.createdAt.toISOString();
      const key = `${t.title}_${t.description}_${timeKey}`;
      
      if (!groups[key]) {
        groups[key] = {
          id: t.id, // reference ID
          title: t.title,
          description: t.description,
          createdAt: t.createdAt,
          dueDate: t.dueDate,
          total: 0,
          completed: 0,
          read: 0,
          operators: []
        };
      }
      groups[key].total++;
      if (t.isCompleted) groups[key].completed++;
      if (t.isRead) groups[key].read++;
      groups[key].operators.push({
        id: t.assignedTo.id,
        name: t.assignedTo.name,
        email: t.assignedTo.email,
        role: t.assignedTo.role,
        isCompleted: t.isCompleted,
        isRead: t.isRead,
        reportText: t.reportText,
        completedAt: t.completedAt
      });
    });

    res.json({ tasks: Object.values(groups) });
  } catch (error) {
    console.error('Fetch admin tasks error:', error);
    res.status(500).json({ error: 'Vazifalarni yuklashda xatolik yuz berdi' });
  }
});

// POST /api/tasks/admin - Send task to all or specific users (operators and teachers)
router.post('/admin', authenticate, requireAdmin, async (req, res) => {
  try {
    const { title, description, operatorIds, dueDate } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Sarlavha va batafsil ma\'lumot kiritilishi shart' });
    }

    let targetOperatorIds = [];
    if (operatorIds === 'all' || !operatorIds || (Array.isArray(operatorIds) && operatorIds.length === 0)) {
      const users = await prisma.user.findMany({
        where: { 
          role: { in: ['OPERATOR', 'TEACHER'] }, 
          isActive: true 
        },
        select: { id: true }
      });
      targetOperatorIds = users.map(o => o.id);
    } else {
      targetOperatorIds = Array.isArray(operatorIds) ? operatorIds : [operatorIds];
    }

    if (targetOperatorIds.length === 0) {
      return res.status(400).json({ error: 'Topshiriq yuborish uchun faol xodimlar topilmadi' });
    }

    const createdTasks = await Promise.all(
      targetOperatorIds.map(opId => {
        return prisma.task.create({
          data: {
            title,
            description,
            assignedToId: opId,
            dueDate: dueDate ? new Date(dueDate) : null
          }
        });
      })
    );

    res.status(201).json({ 
      message: 'Vazifalar muvaffaqiyatli yuborildi', 
      count: createdTasks.length 
    });
  } catch (error) {
    console.error('Create admin task error:', error);
    res.status(500).json({ error: 'Vazifa yaratishda xatolik yuz berdi' });
  }
});


// ================= OPERATOR / TEACHER ENDPOINTS =================

// GET /api/tasks/operator - Get tasks assigned to the current user (operator or teacher)
router.get('/operator', authenticate, async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { assignedToId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ tasks });
  } catch (error) {
    console.error('Fetch operator tasks error:', error);
    res.status(500).json({ error: 'Vazifalarni yuklashda xatolik yuz berdi' });
  }
});

// PATCH /api/tasks/operator/:id/read - Mark task as read
router.patch('/operator/:id/read', authenticate, async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id }
    });

    if (!task) {
      return res.status(404).json({ error: 'Vazifa topilmadi' });
    }

    if (task.assignedToId !== req.user.id) {
      return res.status(403).json({ error: 'Ruxsat berilmagan' });
    }

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });

    res.json({ task: updated });
  } catch (error) {
    console.error('Mark task read error:', error);
    res.status(500).json({ error: 'Vazifani yangilashda xatolik yuz berdi' });
  }
});

// PATCH /api/tasks/operator/:id/complete - Toggle task completed with report
router.patch('/operator/:id/complete', authenticate, async (req, res) => {
  try {
    const { reportText, isCompleted } = req.body;
    const task = await prisma.task.findUnique({
      where: { id: req.params.id }
    });

    if (!task) {
      return res.status(404).json({ error: 'Vazifa topilmadi' });
    }

    if (task.assignedToId !== req.user.id) {
      return res.status(403).json({ error: 'Ruxsat berilmagan' });
    }

    const newCompleted = isCompleted !== undefined ? isCompleted : !task.isCompleted;

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: { 
        isCompleted: newCompleted,
        reportText: newCompleted ? (reportText || task.reportText || "") : null,
        completedAt: newCompleted ? new Date() : null
      }
    });

    res.json({ task: updated });
  } catch (error) {
    console.error('Toggle task complete error:', error);
    res.status(500).json({ error: 'Vazifa holatini o\'zgartirishda xatolik yuz berdi' });
  }
});

module.exports = router;
