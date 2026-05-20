const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// All lead routes require authentication
router.use(authenticate);

// GET /api/leads - Get all leads (for operator: only assigned; for admin: all)
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    
    // Automatically update SLA status for NEW leads whose deadline has passed
    await prisma.lead.updateMany({
      where: {
        status: 'NEW',
        slaDeadline: { lt: now },
        slaBreached: false,
      },
      data: {
        slaBreached: true,
      },
    });

    const { status, search } = req.query;

    const where = {};
    if (req.user.role === 'OPERATOR') {
      where.assignedToId = req.user.id;
    }
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { phone2: { contains: search } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { author: { select: { name: true } } },
        },
      },
      orderBy: [
        { slaDeadline: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({ leads });
  } catch (error) {
    console.error('Get leads error:', error);
    res.json({ leads: [], error: error.message });
  }
});

// GET /api/leads/:id - Get single lead
router.get('/:id', async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, name: true } } },
        },
      },
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    res.json({ lead });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/leads - Create new lead
router.post('/', async (req, res) => {
  try {
    const {
      name, phone, courseInterest, employmentStatus,
      isGrantEligible, source, notes, assignedToId,
    } = req.body;

    // Get SLA time from settings
    const slaSetting = await prisma.setting.findUnique({
      where: { key: 'sla_time_minutes' },
    });
    const slaMinutes = slaSetting ? parseInt(slaSetting.value) : 15;
    const slaDeadline = new Date(Date.now() + slaMinutes * 60 * 1000);

    let finalAssignedToId = assignedToId;
    if (!finalAssignedToId) {
      const operators = await prisma.user.findMany({
        where: { role: 'OPERATOR', isActive: true }
      });
      if (operators.length > 0) {
        const operatorStats = await Promise.all(operators.map(async (op) => {
          const count = await prisma.lead.count({
            where: { assignedToId: op.id, status: { in: ['NEW', 'IN_PROGRESS'] } }
          });
          return { id: op.id, count };
        }));
        operatorStats.sort((a, b) => a.count - b.count);
        finalAssignedToId = operatorStats[0].id;
      }
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        phone,
        courseInterest: courseInterest || 'OTHER',
        employmentStatus: employmentStatus || 'UNEMPLOYED',
        isGrantEligible: isGrantEligible || false,
        source: source || 'manual',
        notes,
        status: 'NEW',
        slaDeadline,
        assignedToId: finalAssignedToId || null,
      },
      include: {
        assignedTo: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ lead });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/leads/:id - Update lead (including status change)
router.patch('/:id', async (req, res) => {
  try {
    const {
      status, nextContactDate, assignedToId,
      courseInterest, employmentStatus, notes,
      isGrantEligible, name, phone,
    } = req.body;

    const existingLead = await prisma.lead.findUnique({
      where: { id: req.params.id },
    });

    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Check if SLA is breached on status change from NEW
    let slaBreached = existingLead.slaBreached;
    if (status && existingLead.status === 'NEW' && existingLead.slaDeadline) {
      if (new Date() > existingLead.slaDeadline) {
        slaBreached = true;
      }
    }

    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (nextContactDate !== undefined) updateData.nextContactDate = nextContactDate ? new Date(nextContactDate) : null;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (courseInterest !== undefined) updateData.courseInterest = courseInterest;
    if (employmentStatus !== undefined) updateData.employmentStatus = employmentStatus;
    if (notes !== undefined) updateData.notes = notes;
    if (isGrantEligible !== undefined) updateData.isGrantEligible = isGrantEligible;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    updateData.slaBreached = slaBreached;

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        assignedTo: { select: { id: true, name: true } },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, name: true } } },
        },
      },
    });

    res.json({ lead });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/leads/:id - Delete lead (admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    await prisma.lead.delete({ where: { id: req.params.id } });
    res.json({ message: 'Lead deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/leads/bulk-delete - Bulk delete leads (admin only)
router.post('/bulk-delete', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid IDs' });
    }
    await prisma.lead.deleteMany({
      where: { id: { in: ids } }
    });
    res.json({ message: `${ids.length} ta lid o'chirildi` });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/leads/delete-all - Delete all leads (admin only)
router.delete('/delete-all/confirmed', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const result = await prisma.lead.deleteMany({});
    res.json({ message: `Barcha ${result.count} ta lid o'chirib tashlandi` });
  } catch (error) {
    console.error('Delete all error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/leads/import - Import leads from Excel
router.post('/import/excel', upload.single('file'), async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet);
    if (rawData.length === 0) {
      return res.status(400).json({ error: 'Fayl bo\'sh yoki ma\'lumotlar topilmadi' });
    }

    const data = rawData.map(row => {
      const normalized = {};
      for (const key in row) {
        normalized[key.trim().toLowerCase()] = row[key];
      }
      return normalized;
    });

    const slaSetting = await prisma.setting.findUnique({
      where: { key: 'sla_time_minutes' },
    });
    const slaMinutes = slaSetting ? parseInt(slaSetting.value) : 15;

    const operators = await prisma.user.findMany({
      where: { role: 'OPERATOR', isActive: true },
      select: { id: true }
    });
    let operatorIndex = 0;

    const leads = [];
    for (const row of data) {
      // Find Name
      let name = row['ismi'] || row['ism'] || row['name'] || row['fio'] || row['full name'];
      if (!name) {
        const nameKey = Object.keys(row).find(k => k.includes('ism') || k.includes('name') || k.includes('fio'));
        if (nameKey) name = row[nameKey];
      }
      name = name || 'Noma\'lum';

      // Find Phone
      let phone = row['telefon raqam 1'] || row['telefon_raqami 1'] || row['telefon'] || row['phone'] || row['tel'] || row['telefon raqami'];
      if (!phone) {
        const phoneKey = Object.keys(row).find(k => (k.includes('tel') || k.includes('phone')) && !k.includes('2'));
        if (phoneKey) phone = row[phoneKey];
      }

      // Skip row if no phone and no name (or name is Noma'lum)
      if (!phone && name === 'Noma\'lum') continue;
      
      // Normalize phone to string
      phone = phone ? String(phone) : '';

      // Find Phone 2
      let phone2 = row['telefon raqam 2'] || row['telefon_raqami 2'] || row['phone 2'] || row['phone2'] || row['tel 2'];
      if (!phone2) {
        const phone2Key = Object.keys(row).find(k => (k.includes('tel') || k.includes('phone')) && k.includes('2'));
        if (phone2Key) phone2 = row[phone2Key];
      }
      phone2 = phone2 ? String(phone2) : null;

      // Direct Course and Employment from Excel - Refined Column Detection
      const allKeys = Object.keys(row);
      
      const courseKey = allKeys.find(k => {
        const key = k.toLowerCase();
        return key.includes('kurs') || key.includes('course') || key.includes('yonalish') || key.includes('yo\'nalish') || key.includes('qiziqish');
      });
      const courseInterest = courseKey ? String(row[courseKey]) : 'Boshqa';

      const empKey = allKeys.find(k => {
        const key = k.toLowerCase();
        if (k === courseKey) return false; // Skip the course column
        // Specific employment keywords, avoiding 'ish' as it's too broad (matches qiziqish)
        return key.includes('bandlik') || key.includes('bant') || key.includes('employment') || key.includes('status') || key.includes('holat');
      });
      const employmentStatus = empKey ? String(row[empKey]) : 'Ishsiz';

      // Parse time
      let createdAt = new Date();
      const timeKey = Object.keys(row).find(k => k.includes('vaqt') || k.includes('time') || k.includes('sana') || k.includes('date'));
      if (timeKey && row[timeKey]) {
        // Excel often stores dates as numbers (days since 1900)
        if (typeof row[timeKey] === 'number') {
          // convert Excel serial date to JS date
          createdAt = new Date(Math.round((row[timeKey] - 25569) * 86400 * 1000));
        } else {
          const parsedDate = new Date(row[timeKey]);
          if (!isNaN(parsedDate.getTime())) createdAt = parsedDate;
        }
      }
      
      // Safety check: if date is before 2020, it's likely an error, use current date
      if (createdAt.getFullYear() < 2020) {
        createdAt = new Date();
      }

      const notes = row['o\'qiydi (ha-yo\'q)'] || row['izoh'] || row['notes'] || row['comment'];

      let assignedToId = null;
      if (operators.length > 0) {
        assignedToId = operators[operatorIndex % operators.length].id;
        operatorIndex++;
      }

      leads.push({
        name,
        phone,
        phone2,
        courseInterest,
        employmentStatus,
        isGrantEligible: row['grant'] === 'ha' || row['grant'] === true || false,
        source: 'excel_import',
        status: 'NEW',
        slaDeadline: new Date(Date.now() + slaMinutes * 60 * 1000),
        notes: notes ? String(notes) : undefined,
        createdAt,
        assignedToId
      });
    }
    if (leads.length === 0) {
      return res.status(400).json({ error: 'Faylda yaroqli lid ma\'lumotlari topilmadi' });
    }

    let importedCount = 0;
    let errorCount = 0;
    let lastError = null;

    for (const leadData of leads) {
      try {
        await prisma.lead.create({ data: leadData });
        importedCount++;
      } catch (err) {
        errorCount++;
        lastError = err.message;
        console.error('Single lead import error:', err);
      }
    }

    if (importedCount === 0 && leads.length > 0) {
      return res.status(500).json({ 
        error: 'Barcha lidlarni saqlashda xatolik yuz berdi.', 
        details: lastError 
      });
    }

    res.json({ 
      message: `${importedCount} ta lid muvaffaqiyatli import qilindi. ${errorCount > 0 ? errorCount + ' ta xatolik.' : ''}`,
      count: importedCount 
    });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Faylni o\'qishda xatolik yuz berdi', details: error.message });
  }
});

// GET /api/leads/export/excel - Export leads to Excel
router.get('/export/excel', async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const leads = await prisma.lead.findMany({
      include: { assignedTo: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const data = leads.map(l => ({
      'ID': l.id,
      'Ism': l.name,
      'Telefon 1': l.phone,
      'Telefon 2': l.phone2 || '',
      'Kurs': l.courseInterest,
      'Bandlik': l.employmentStatus,
      'Grant': l.isGrantEligible ? 'Ha' : "Yo'q",
      'Holat': l.status,
      'O\'qiydi (ha-yo\'q)': l.notes || '',
      'Operator': l.assignedTo?.name || 'Biriktirilmagan',
      'SLA Buzildi': l.slaBreached ? 'Ha' : "Yo'q",
      'Yaratilgan': l.createdAt.toLocaleString('uz-UZ'),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lidlar');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=lidlar.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// GET /api/leads/today - Get leads with next contact date today
router.get('/schedule/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where = {
      nextContactDate: { gte: today, lt: tomorrow },
    };
    if (req.user.role === 'OPERATOR') {
      where.assignedToId = req.user.id;
    }

    const leads = await prisma.lead.findMany({
      where,
      include: { assignedTo: { select: { name: true } } },
      orderBy: { nextContactDate: 'asc' },
    });

    res.json({ leads });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
