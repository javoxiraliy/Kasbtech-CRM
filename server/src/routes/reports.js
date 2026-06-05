const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../middleware/auth');

const prisma = new PrismaClient();

// Get all reports (Admin only)
router.get('/admin', authenticate, requireAdmin, async (req, res) => {
    try {
        const reports = await prisma.report.findMany({
            include: {
                author: {
                    select: { id: true, name: true, role: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ reports });
    } catch (error) {
        console.error('Error fetching reports for admin:', error);
        res.status(500).json({ error: 'Server xatosi (hisobotlar)' });
    }
});

// Get reports for logged-in user
router.get('/', authenticate, async (req, res) => {
    try {
        const reports = await prisma.report.findMany({
            where: { authorId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ reports });
    } catch (error) {
        console.error('Error fetching user reports:', error);
        res.status(500).json({ error: 'Server xatosi' });
    }
});

// Create a new report
router.post('/', authenticate, async (req, res) => {
    try {
        const { type, content } = req.body;
        
        if (!type || !content) {
            return res.status(400).json({ error: 'Hisobot turi va matni kiritilishi shart' });
        }

        const report = await prisma.report.create({
            data: {
                type,
                content,
                authorId: req.user.id
            },
            include: {
                author: {
                    select: { id: true, name: true, role: true }
                }
            }
        });
        
        res.status(201).json({ report });
    } catch (error) {
        console.error('Error creating report:', error);
        res.status(500).json({ error: 'Server xatosi (hisobot yaratish)' });
    }
});

module.exports = router;
