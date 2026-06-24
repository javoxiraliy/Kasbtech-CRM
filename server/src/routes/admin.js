const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../prismaClient');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, requireAdmin);

// GET /api/admin/dashboard - Dashboard metrics
router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);

    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      totalLeads,
      todayLeads,
      weekLeads,
      monthLeads,
      successLeads,
      slaBreachedLeads,
      leadsByStatus,
      leadsByCourse,
      operatorStats,
      totalStudents,
      totalCourses,
      totalTeachers,
      totalEnrollments,
      coursesWithEnrollments,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.lead.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.lead.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.lead.count({ where: { status: 'SUCCESS' } }),
      prisma.lead.count({ where: { slaBreached: true } }),
      prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.lead.groupBy({ by: ['courseInterest'], _count: { _all: true } }),
      prisma.user.findMany({
        where: { role: 'OPERATOR', isActive: true },
        include: {
          _count: {
            select: { leads: true },
          },
          leads: {
            select: {
              status: true,
              slaBreached: true,
            },
          },
        },
      }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.course.count(),
      prisma.user.count({ where: { OR: [{ role: 'TEACHER' }, { role: 'MENTOR' }] } }),
      prisma.enrollment.count(),
      prisma.course.findMany({
        select: {
          id: true,
          title: true,
          _count: {
            select: { enrollments: true }
          }
        }
      })
    ]);

    const conversionRate = totalLeads > 0
      ? ((successLeads / totalLeads) * 100).toFixed(1)
      : 0;

    const operators = operatorStats.map(op => ({
      id: op.id,
      name: op.name,
      email: op.email,
      totalLeads: op._count.leads,
      activeLeads: op.leads.filter(l => l.status === 'IN_PROGRESS' || l.status === 'VOUCHER_CHECK').length,
      successLeads: op.leads.filter(l => l.status === 'SUCCESS').length,
      archivedLeads: op.leads.filter(l => l.status === 'ARCHIVED').length,
      slaBreached: op.leads.filter(l => l.slaBreached).length,
    }));

    res.json({
      metrics: {
        totalLeads: totalLeads || 0,
        todayLeads: todayLeads || 0,
        weekLeads: weekLeads || 0,
        monthLeads: monthLeads || 0,
        successLeads: successLeads || 0,
        slaBreachedLeads: slaBreachedLeads || 0,
        conversionRate,
        totalStudents: totalStudents || 0,
        totalCourses: totalCourses || 0,
        totalTeachers: totalTeachers || 0,
        totalEnrollments: totalEnrollments || 0
      },
      leadsByStatus: (leadsByStatus || []).map(s => ({
        status: s.status,
        count: s._count._all,
      })),
      leadsByCourse: (leadsByCourse || []).map(c => ({
        course: c.courseInterest,
        count: c._count._all,
      })),
      operators,
      lmsStats: {
        coursesEnrollments: (coursesWithEnrollments || []).map(c => ({
          courseId: c.id,
          title: c.title,
          enrollmentsCount: c._count.enrollments
        }))
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.json({
      metrics: { 
        totalLeads: 0, todayLeads: 0, weekLeads: 0, monthLeads: 0, successLeads: 0, slaBreachedLeads: 0, conversionRate: 0,
        totalStudents: 0, totalCourses: 0, totalTeachers: 0, totalEnrollments: 0
      },
      leadsByStatus: [],
      leadsByCourse: [],
      operators: [],
      lmsStats: { coursesEnrollments: [] },
      error: error.message
    });
  }
});

// GET /api/admin/users - Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true,
        role: true, isActive: true, createdAt: true,
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/users - Create new user
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role, workingHours } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Ism, email va parol kiritilishi shart' });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(400).json({ error: 'Ushbu email allaqachon mavjud' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || 'OPERATOR',
        workingHours: workingHours || '09:00 - 18:00',
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, workingHours: true, createdAt: true },
    });

    res.status(201).json({ user });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/users/:id - Update user
router.patch('/users/:id', async (req, res) => {
  try {
    const { name, isActive, role, password, workingHours } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (role !== undefined) updateData.role = role;
    if (workingHours !== undefined) updateData.workingHours = workingHours;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActive: true, workingHours: true },
    });

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/users/:id - Delete user completely
router.delete('/users/:id', async (req, res) => {
  try {
    // Before deleting, unassign their leads
    await prisma.lead.updateMany({
      where: { assignedToId: req.params.id },
      data: { assignedToId: null }
    });

    // Delete their comments (foreign key constraint)
    await prisma.comment.deleteMany({
      where: { authorId: req.params.id }
    });

    // Delete their tasks (foreign key constraint)
    await prisma.task.deleteMany({
      where: { assignedToId: req.params.id }
    });

    await prisma.user.delete({
      where: { id: req.params.id },
    });
    res.json({ message: 'Hodim butunlay o\'chirildi' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Hodimni o\'chirishda xatolik yuz berdi: ' + error.message });
  }
});

// GET /api/admin/kpi - Detailed KPI report
router.get('/kpi', async (req, res) => {
  try {
    const operators = await prisma.user.findMany({
      where: { role: 'OPERATOR' },
      include: {
        leads: {
          select: { status: true, slaBreached: true, createdAt: true },
        },
      },
    });

    const kpi = operators.map(op => ({
      id: op.id,
      name: op.name,
      email: op.email,
      isActive: op.isActive,
      totalAssigned: op.leads.length,
      successCount: op.leads.filter(l => l.status === 'SUCCESS').length,
      slaBreachedCount: op.leads.filter(l => l.slaBreached).length,
      conversionRate: op.leads.length > 0
        ? ((op.leads.filter(l => l.status === 'SUCCESS').length / op.leads.length) * 100).toFixed(1)
        : '0',
    }));

    res.json({ kpi });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/operators/:id/activity - Get detailed operator activity
router.get('/operators/:id/activity', async (req, res) => {
  try {
    const operator = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      }
    });

    if (!operator) {
      return res.status(404).json({ error: 'Operator not found' });
    }

    const leads = await prisma.lead.findMany({
      where: { assignedToId: req.params.id },
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: {
            author: { select: { name: true } }
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { updatedAt: 'desc' }
      ]
    });

    // Also get all comments left by this operator regardless of lead assignment
    const recentComments = await prisma.comment.findMany({
      where: { authorId: req.params.id },
      include: {
        lead: { select: { name: true, phone: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    res.json({
      operator,
      leads,
      recentComments
    });
  } catch (error) {
    console.error('Operator activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
