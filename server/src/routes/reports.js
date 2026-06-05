const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../middleware/auth');

const prisma = new PrismaClient();

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
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
    fileFilter: (req, file, cb) => {
        const allowedExtensions = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx/;
        const allowedMimeTypes = /image\/jpeg|image\/png|image\/gif|image\/webp|application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/;
        
        const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedMimeTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Faqat rasm (jpg, png, gif, webp), PDF, Word (doc, docx) va Excel (xls, xlsx) fayllar ruxsat etiladi!'));
    }
});

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

// File upload endpoint for reports
router.post('/upload', authenticate, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Fayl yuklanmadi' });
        }
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ url: fileUrl, name: req.file.originalname });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ error: 'Fayl yuklashda xatolik' });
    }
});

// Create a new report
router.post('/', authenticate, async (req, res) => {
    try {
        const { type, content, attachmentUrls } = req.body;
        
        if (!type || !content) {
            return res.status(400).json({ error: 'Hisobot turi va matni kiritilishi shart' });
        }

        const report = await prisma.report.create({
            data: {
                type,
                content,
                authorId: req.user.id,
                attachmentUrls: attachmentUrls || []
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
