const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

let lastSlaUpdate = 0;

// All lead routes require authentication
router.use(authenticate);

// GET /api/leads - Get all leads (for operator: only assigned; for admin: all)
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    
    // Automatically update SLA status for NEW leads whose deadline has passed (throttled to once every 30s)
    if (Date.now() - lastSlaUpdate > 30000) {
      lastSlaUpdate = Date.now();
      await prisma.lead.updateMany({
        where: {
          status: 'NEW',
          slaDeadline: { lt: now },
          slaBreached: false,
        },
        data: {
          slaBreached: true,
        },
      }).catch(err => console.error("SLA Auto-update failed:", err));
    }

    const { status, search, startDate, endDate } = req.query;

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
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
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

const COURSE_LABELS = {
  VIDEOGRAPHY: 'Videomontaj "videografiya"',
  SMM: 'SMM',
  TARGET_PRO: 'Target pro',
  COMPUTER_GRAPHICS: 'Kompyuter grafikasi',
  COMPUTER_LITERACY: 'Kompyuter savodxonligi',
  GRAPHIC_DESIGN: 'Grafik dizayn',
  AUTOCAD: 'AutoCAD',
  THREE_D_MAX: '3D MAX',
  CYBERSECURITY: 'Kiberxavfsizlik',
  OTHER: 'Boshqa',
  VIDEO_EDITING: 'Video montaj',
  WEB_DEVELOPMENT: 'Web dasturlash',
  PYTHON: 'Python'
};

const EMPLOYMENT_LABELS = {
  UNEMPLOYED: 'Ishsiz',
  EMPLOYED_OFFICIAL: 'Rasmiy band',
  EMPLOYED_UNOFFICIAL: 'Rasmiy band emas',
  STUDENT: 'Talaba',
  STUDENT_EXTERNAL: 'Talaba "sirtqi"',
  SCHOOL_STUDENT: 'Maktab o\'quvchisi',
  HOUSEWIFE: 'Uy bekasi',
  employed: 'Ishlaydi',
  unemployed: 'Ishsiz',
  housewife: 'Uy bekasi',
  student: 'Talaba'
};

const normalizeCourse = (val) => {
  if (!val) return 'OTHER';
  const s = String(val).toLowerCase().trim().replace(/_/g, ' ');
  if (s.includes('smm')) return 'SMM';
  if (s.includes('target') || s.includes('targ')) return 'TARGET_PRO';
  if (s.includes('savod') || s.includes('literacy')) return 'COMPUTER_LITERACY';
  if (s.includes('grafik dizayn') || s.includes('dizayn') || s.includes('design')) return 'GRAPHIC_DESIGN';
  if (s.includes('videografiya') || s.includes('videography')) return 'VIDEOGRAPHY';
  if (s.includes('video') || s.includes('montaj') || s.includes('editing')) return 'VIDEO_EDITING';
  if (s.includes('web') || s.includes('dastur') || s.includes('web dasturlash') || s.includes('development')) return 'WEB_DEVELOPMENT';
  if (s.includes('python') || s.includes('payton')) return 'PYTHON';
  if (s.includes('autocad') || s.includes('avtokad')) return 'AUTOCAD';
  if (s.includes('3d') || s.includes('max') || s.includes('3ds')) return 'THREE_D_MAX';
  if (s.includes('kompyuter grafikasi') || s.includes('graphics')) return 'COMPUTER_GRAPHICS';
  if (s.includes('kiber') || s.includes('cyber') || s.includes('xavfsizlik') || s.includes('security')) return 'CYBERSECURITY';
  
  const upper = val.toUpperCase().trim().replace(/[\s-]/g, '_');
  if (COURSE_LABELS[upper]) return upper;

  return val;
};

const normalizeEmployment = (val) => {
  if (!val) return 'UNEMPLOYED';
  const s = String(val).toLowerCase().trim().replace(/_/g, ' ');
  if (s.includes('ishsiz') || s.includes('unemployed') || s.includes('ishlamaydi') || s.includes('ishlamiman')) return 'UNEMPLOYED';
  if (s.includes('rasmiy band emas') || s.includes('norasmiy') || s.includes('unofficial')) return 'EMPLOYED_UNOFFICIAL';
  if (s.includes('rasmiy') || s.includes('official') || s.includes('ishlaydi') || s.includes('ishlidi')) return 'EMPLOYED_OFFICIAL';
  if (s.includes('sirtqi')) return 'STUDENT_EXTERNAL';
  if (s.includes('maktab') || s.includes('o\'quvchi') || s.includes('oquvchi') || s.includes('school')) return 'SCHOOL_STUDENT';
  if (s.includes('talaba') || s.includes('student')) return 'STUDENT';
  if (s.includes('uy bekasi') || s.includes('housewife') || s.includes('beka')) return 'HOUSEWIFE';
  
  const upper = val.toUpperCase().trim().replace(/[\s-]/g, '_');
  if (EMPLOYMENT_LABELS[upper]) return upper;

  return val;
};

const normalizePhoneNumber = (val) => {
  if (!val) return '';
  let digits = String(val).replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length === 9) {
    digits = '998' + digits;
  }
  
  if (digits.length === 12 && digits.startsWith('998')) {
    return '+' + digits;
  }

  const strVal = String(val).trim();
  if (strVal.startsWith('+')) {
    return '+' + digits;
  }
  return digits;
};


const parseExcelDate = (val) => {
  if (!val) return new Date();
  
  if (typeof val === 'number') {
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  
  const str = String(val).trim();
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;
  
  const dateParts = str.match(/^(\d{1,2})[./-]\s*(\d{1,2})[./-]\s*(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (dateParts) {
    const day = parseInt(dateParts[1], 10);
    const month = parseInt(dateParts[2], 10) - 1;
    const year = parseInt(dateParts[3], 10);
    const hour = parseInt(dateParts[4] || 0, 10);
    const minute = parseInt(dateParts[5] || 0, 10);
    const second = parseInt(dateParts[6] || 0, 10);
    return new Date(year, month, day, hour, minute, second);
  }
  
  const dateParts2 = str.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (dateParts2) {
    const year = parseInt(dateParts2[1], 10);
    const month = parseInt(dateParts2[2], 10) - 1;
    const day = parseInt(dateParts2[3], 10);
    const hour = parseInt(dateParts2[4] || 0, 10);
    const minute = parseInt(dateParts2[5] || 0, 10);
    const second = parseInt(dateParts2[6] || 0, 10);
    return new Date(year, month, day, hour, minute, second);
  }
  
  return new Date();
};

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
      const allKeys = Object.keys(row);

      // Find Name
      let name = row['ismi'] || row['ism'] || row['name'] || row['fio'] || row['full name'] || row['ism sharif'] || row['f.i.o'] || row['f.i.o.'] || row['ismingiz?'] || row['ismingiz'];
      if (!name) {
        const nameKey = allKeys.find(k => {
          const s = k.toLowerCase().replace(/['’`‘]/g, '');
          return s.includes('ism') || 
                 s.includes('name') || 
                 s.includes('fio') || 
                 s.includes('фио') || 
                 s.includes('имя') || 
                 s.includes('mijoz') || 
                 s.includes('client') || 
                 s.includes('klient');
        });
        if (nameKey) name = row[nameKey];
      }
      name = name ? String(name).trim() : 'Noma\'lum';

      // Find Phone and Phone 2 (Robust Multi-phone Extraction)
      const phoneKeys = allKeys.filter(k => {
        const s = k.toLowerCase().replace(/['’`‘]/g, '');
        if (s.includes('telegram') || s.includes('email') || s.includes('mail')) return false;
        return s.includes('tel') || 
               s.includes('phone') || 
               s.includes('nomer') || 
               s.includes('raqam') || 
               s.includes('aloqa') || 
               s.includes('contact') || 
               s.includes('kontak') || 
               s.includes('тел') || 
               s.includes('номер') || 
               s.includes('телефон') || 
               s.includes('связь');
      });

      const primaryKeys = [];
      const secondaryKeys = [];
      for (const k of phoneKeys) {
        const s = k.toLowerCase();
        const isSecondary = s.includes('2') || 
                            s.includes('ikki') || 
                            s.includes('qosh') || 
                            s.includes('qo\'sh') || 
                            s.includes('dop') || 
                            s.includes('доп') || 
                            s.includes('второй') || 
                            s.includes('second');
        if (isSecondary) {
          secondaryKeys.push(k);
        } else {
          primaryKeys.push(k);
        }
      }

      const primaryValues = primaryKeys.map(k => normalizePhoneNumber(row[k])).filter(Boolean);
      const secondaryValues = secondaryKeys.map(k => normalizePhoneNumber(row[k])).filter(Boolean);
      const uniquePhones = Array.from(new Set([...primaryValues, ...secondaryValues]));

      let phone = uniquePhones[0] || '';
      let phone2 = uniquePhones[1] || null;

      // Skip row if no phone and no name (or name is Noma'lum)
      if (!phone && name === 'Noma\'lum') continue;

      // Find Course / Department / Section / Direction
      const courseKey = allKeys.find(k => {
        const s = k.toLowerCase().replace(/['’`‘]/g, '');
        return s.includes('kurs') || 
               s.includes('course') || 
               s.includes('yonalish') || 
               s.includes('yonalis') || 
               s.includes('qiziqish') || 
               s.includes('bolim') || 
               s.includes('napravlen') || 
               s.includes('направлен');
      });
      const courseInterestRaw = courseKey ? row[courseKey] : null;
      const courseInterest = normalizeCourse(courseInterestRaw);

      // Find Employment Status
      const empKey = allKeys.find(k => {
        if (k === courseKey) return false;
        const s = k.toLowerCase().replace(/['’`‘]/g, '');
        return s.includes('bandlik') || 
               s.includes('band') || 
               s.includes('bant') || 
               s.includes('employment') || 
               s.includes('status') || 
               s.includes('holat') || 
               s.includes('faoliyat') || 
               s.includes('ishla') || 
               s === 'ish' || 
               s.includes('rabot') || 
               s.includes('zanyat') || 
               s.includes('занятост') || 
               s.includes('работ');
      });
      const employmentStatusRaw = empKey ? row[empKey] : null;
      const employmentStatus = normalizeEmployment(employmentStatusRaw);

      // Parse time
      let createdAt = new Date();
      const timeKey = allKeys.find(k => {
        const s = k.toLowerCase();
        return s.includes('vaqt') || s.includes('time') || s.includes('sana') || s.includes('date') || s.includes('tushgan') || s.includes('yuklangan') || s.includes('yaratilgan') || s.includes('created');
      });
      if (timeKey && row[timeKey]) {
        createdAt = parseExcelDate(row[timeKey]);
      }
      
      if (createdAt.getFullYear() < 2020) {
        createdAt = new Date();
      }

      // Find Notes / comments
      const notesKey = allKeys.find(k => {
        const s = k.toLowerCase();
        return s.includes('izoh') || s.includes('notes') || s.includes('comment') || s.includes('o\'qiydi') || s.includes('oqiydi');
      });
      const notes = notesKey ? String(row[notesKey]) : undefined;

      // Find Grant
      const grantKey = allKeys.find(k => k.toLowerCase().includes('grant'));
      const isGrantEligible = grantKey ? (row[grantKey] === 'ha' || row[grantKey] === true || String(row[grantKey]).toLowerCase().trim() === 'ha') : false;

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
        isGrantEligible,
        source: 'excel_import',
        status: 'NEW',
        slaDeadline: new Date(Date.now() + slaMinutes * 60 * 1000),
        notes: notes || undefined,
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

// GET /api/leads/export/excel - Export leads to Excel (both ADMIN and OPERATOR)
router.get('/export/excel', async (req, res) => {
  try {
    const { status, search, startDate, endDate } = req.query;

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
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const leads = await prisma.lead.findMany({
      where,
      include: { 
        assignedTo: { select: { name: true } },
        comments: {
          include: { author: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = leads.map(l => {
      const commentText = l.comments && l.comments.length > 0
        ? l.comments.map(c => `${c.author?.name || 'Operator'}: ${c.content}`).join(' | ')
        : '';
        
      return {
        'ID': l.id,
        'Ism': l.name,
        'Telefon 1': l.phone,
        'Telefon 2': l.phone2 || '',
        'Kurs / Bo\'lim': l.courseInterest,
        'Bandlik': l.employmentStatus,
        'Grant': l.isGrantEligible ? 'Ha' : "Yo'q",
        'Holat': l.status,
        'Operator Izohlari': commentText,
        'O\'qiydi (ha-yo\'q)': l.notes || '',
        'Operator': l.assignedTo?.name || 'Biriktirilmagan',
        'SLA Buzildi': l.slaBreached ? 'Ha' : "Yo'q",
        'Yaratilgan': l.createdAt.toLocaleString('uz-UZ'),
      };
    });

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
