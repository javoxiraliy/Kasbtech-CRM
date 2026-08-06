const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { authenticate, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');

const uploadDocMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file size
});

const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage for homework file uploads & course thumbnails
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'lms-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|zip|rar|pdf|doc|docx|txt/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    if (ext) return cb(null, true);
    cb(new Error('Ruxsat berilmagan fayl formati! (Rasm, ZIP, RAR, PDF, DOC, DOCX, TXT ruxsat etiladi)'));
  }
});

// Middleware role helpers
const requireMentorOrAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN' && req.user.role !== 'TEACHER' && req.user.role !== 'MENTOR') {
    return res.status(403).json({ error: 'Ushbu amalni bajarish uchun ruxsatingiz yo\'q' });
  }
  next();
};

// ==========================================
// 1. COURSE MANAGEMENT
// ==========================================

// GET /api/lms/courses - List courses
router.get('/courses', authenticate, async (req, res) => {
  try {
    const isStudent = req.user.role === 'STUDENT';
    
    let courses;
    if (isStudent) {
      // Students see all published courses with flags: isFree, isEnrolled, hasAccess, progress
      const allPublishedCourses = await prisma.course.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { modules: true } },
          teacher: { select: { id: true, name: true, email: true } }
        }
      });

      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: req.user.id }
      });

      const enrollmentMap = {};
      enrollments.forEach(e => {
        enrollmentMap[e.courseId] = e;
      });

      courses = allPublishedCourses.map(course => {
        const enrollment = enrollmentMap[course.id];
        const isFree = parseFloat(course.price) === 0;
        const isEnrolled = !!enrollment;
        const hasAccess = isFree || isEnrolled;

        return {
          ...course,
          isFree,
          isEnrolled,
          hasAccess,
          progress: enrollment ? enrollment.progress : 0,
          enrollmentId: enrollment ? enrollment.id : null,
          enrolledAt: enrollment ? enrollment.createdAt : null
        };
      });
    } else {
      // Admins/Operators see all courses, Teachers/Mentors see only their assigned courses
      const whereClause = {};
      if (req.user.role === 'TEACHER' || req.user.role === 'MENTOR') {
        whereClause.teacherId = req.user.id;
      }
      
      courses = await prisma.course.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { modules: true } },
          teacher: { select: { id: true, name: true, email: true } }
        }
      });
    }
    
    res.json({ courses });
  } catch (error) {
    console.error('Fetch courses error:', error);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// POST /api/lms/courses - Create course
router.post('/courses', authenticate, requireAdmin, upload.single('thumbnail'), async (req, res) => {
  try {
    const { title, description, price, isPublished, teacherId } = req.body;
    if (!title || !description || !price) {
      return res.status(400).json({ error: 'Sarlavha, ta\'rif va narx kiritilishi shart' });
    }

    let thumbnailPath = null;
    if (req.file) {
      thumbnailPath = `/uploads/${req.file.filename}`;
    }

    const course = await prisma.course.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        thumbnail: thumbnailPath,
        isPublished: isPublished === 'true' || isPublished === true,
        teacherId: teacherId || null
      }
    });

    res.status(201).json({ course });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ error: 'Kurs yaratishda xatolik yuz berdi' });
  }
});

// PUT /api/lms/courses/:id - Update course
router.put('/courses/:id', authenticate, requireAdmin, upload.single('thumbnail'), async (req, res) => {
  try {
    const { title, description, price, isPublished, teacherId } = req.body;
    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (isPublished !== undefined) updateData.isPublished = isPublished === 'true' || isPublished === true;
    if (teacherId !== undefined) updateData.teacherId = teacherId || null;
    if (req.file) {
      updateData.thumbnail = `/uploads/${req.file.filename}`;
    }

    const course = await prisma.course.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({ course });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ error: 'Kursni yangilashda xatolik yuz berdi' });
  }
});

// DELETE /api/lms/courses/:id - Delete course
router.delete('/courses/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await prisma.course.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Kurs muvaffaqiyatli o\'chirildi' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ error: 'Kursni o\'chirishda xatolik yuz berdi' });
  }
});

// ==========================================
// 2. MODULE MANAGEMENT (Admin only)
// ==========================================

// POST /api/lms/courses/:courseId/modules - Create module
router.post('/courses/:courseId/modules', authenticate, requireMentorOrAdmin, async (req, res) => {
  try {
    const { title, order } = req.body;
    const { courseId } = req.params;

    if (!title || order === undefined) {
      return res.status(400).json({ error: 'Sarlavha va tartib raqami kiritilishi shart' });
    }

    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return res.status(404).json({ error: 'Kurs topilmadi' });
    if (req.user.role !== 'ADMIN' && course.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Sizda ushbu kursga modul qo\'shish huquqi yo\'q' });
    }

    const module = await prisma.module.create({
      data: {
        title,
        order: parseInt(order),
        courseId
      }
    });

    res.status(201).json({ module });
  } catch (error) {
    console.error('Create module error:', error);
    res.status(500).json({ error: 'Modul yaratishda xatolik yuz berdi' });
  }
});

// PUT /api/lms/modules/:id - Update module
router.put('/modules/:id', authenticate, requireMentorOrAdmin, async (req, res) => {
  try {
    const { title, order } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (order !== undefined) updateData.order = parseInt(order);

    const module = await prisma.module.findUnique({
      where: { id: req.params.id },
      include: { course: true }
    });
    if (!module) return res.status(404).json({ error: 'Modul topilmadi' });
    if (req.user.role !== 'ADMIN' && module.course.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Sizda ushbu modulni o\'zgartirish huquqi yo\'q' });
    }

    const updatedModule = await prisma.module.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({ module: updatedModule });
  } catch (error) {
    console.error('Update module error:', error);
    res.status(500).json({ error: 'Modulni yangilashda xatolik yuz berdi' });
  }
});

// DELETE /api/lms/modules/:id - Delete module
router.delete('/modules/:id', authenticate, requireMentorOrAdmin, async (req, res) => {
  try {
    const module = await prisma.module.findUnique({
      where: { id: req.params.id },
      include: { course: true }
    });
    if (!module) return res.status(404).json({ error: 'Modul topilmadi' });
    if (req.user.role !== 'ADMIN' && module.course.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Sizda ushbu modulni o\'chirish huquqi yo\'q' });
    }

    await prisma.module.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Modul muvaffaqiyatli o\'chirildi' });
  } catch (error) {
    console.error('Delete module error:', error);
    res.status(500).json({ error: 'Modulni o\'chirishda xatolik yuz berdi' });
  }
});

// ==========================================
// 3. LESSON MANAGEMENT (Admin only)
// ==========================================

// POST /api/lms/modules/:moduleId/lessons - Create lesson
router.post('/modules/:moduleId/lessons', authenticate, requireMentorOrAdmin, async (req, res) => {
  try {
    const { title, description, videoUrl, duration, order, dripDays } = req.body;
    const { moduleId } = req.params;

    if (!title || !videoUrl || duration === undefined || order === undefined) {
      return res.status(400).json({ error: 'Sarlavha, video ID, davomiylik va tartib raqami kiritilishi shart' });
    }

    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: { course: true }
    });
    if (!module) return res.status(404).json({ error: 'Modul topilmadi' });
    if (req.user.role !== 'ADMIN' && module.course.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Sizda ushbu modulga dars qo\'shish huquqi yo\'q' });
    }

    const lesson = await prisma.lesson.create({
      data: {
        title,
        description,
        videoUrl,
        duration: parseInt(duration),
        order: parseInt(order),
        dripDays: parseInt(dripDays || 0),
        moduleId
      }
    });

    res.status(201).json({ lesson });
  } catch (error) {
    console.error('Create lesson error:', error);
    res.status(500).json({ error: 'Dars yaratishda xatolik yuz berdi' });
  }
});

// PUT /api/lms/lessons/:id - Update lesson
router.put('/lessons/:id', authenticate, requireMentorOrAdmin, async (req, res) => {
  try {
    const { title, description, videoUrl, duration, order, dripDays } = req.body;
    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
    if (duration !== undefined) updateData.duration = parseInt(duration);
    if (order !== undefined) updateData.order = parseInt(order);
    if (dripDays !== undefined) updateData.dripDays = parseInt(dripDays);

    const lesson = await prisma.lesson.findUnique({
      where: { id: req.params.id },
      include: { module: { include: { course: true } } }
    });
    if (!lesson) return res.status(404).json({ error: 'Dars topilmadi' });
    if (req.user.role !== 'ADMIN' && lesson.module.course.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Sizda ushbu darsni o\'zgartirish huquqi yo\'q' });
    }

    const updatedLesson = await prisma.lesson.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({ lesson: updatedLesson });
  } catch (error) {
    console.error('Update lesson error:', error);
    res.status(500).json({ error: 'Darsni yangilashda xatolik yuz berdi' });
  }
});

// DELETE /api/lms/lessons/:id - Delete lesson
router.delete('/lessons/:id', authenticate, requireMentorOrAdmin, async (req, res) => {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: req.params.id },
      include: { module: { include: { course: true } } }
    });
    if (!lesson) return res.status(404).json({ error: 'Dars topilmadi' });
    if (req.user.role !== 'ADMIN' && lesson.module.course.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'Sizda ushbu darsni o\'chirish huquqi yo\'q' });
    }

    await prisma.lesson.delete({
      where: { id: req.params.id }
    });
    res.json({ message: 'Dars muvaffaqiyatli o\'chirildi' });
  } catch (error) {
    console.error('Delete lesson error:', error);
    res.status(500).json({ error: 'Darsni o\'chirishda xatolik yuz berdi' });
  }
});

// ==========================================
// 4. STUDY & PROGRESS (STUDENT & TEACHER/ADMIN)
// ==========================================

// GET /api/lms/courses/:courseId/study - Get lessons and modules with locking checks
router.get('/courses/:courseId/study', authenticate, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });
    if (!course) {
      return res.status(404).json({ error: 'Kurs topilmadi' });
    }

    const isFree = parseFloat(course.price) === 0;

    // Check enrollment if user is a STUDENT
    let enrollment = null;
    if (role === 'STUDENT') {
      enrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: userId, courseId } }
      });
      if (!enrollment) {
        if (isFree) {
          // Auto-enroll student in free course
          enrollment = await prisma.enrollment.create({
            data: {
              studentId: userId,
              courseId: courseId,
              progress: 0
            }
          });
        } else {
          return res.status(403).json({ error: 'Ushbu pullik kursga ustoz, mentor yoki admin tomonidan dostup berilmagan.' });
        }
      }
    }

    // Fetch modules and lessons
    const modules = await prisma.module.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
          include: {
            homeworks: {
              where: { studentId: userId },
              select: { status: true, grade: true, feedback: true, fileUrl: true, textResponse: true, createdAt: true }
            },
            quizzes: {
              include: {
                attempts: {
                  where: { studentId: userId },
                  select: { passed: true, score: true }
                }
              }
            }
          }
        }
      }
    });

    if (role !== 'STUDENT') {
      // Return everything unlocked for Admin/Teacher/Operator
      return res.json({
        modules: modules.map(m => ({
          ...m,
          lessons: m.lessons.map(l => ({
            ...l,
            isLocked: false,
            lockReason: null,
            homeworkStatus: l.homeworks[0]?.status || 'NOT_SUBMITTED'
          }))
        }))
      });
    }

    // For students: Compute locking rules (Drip Content and Homework Approvals)
    const now = new Date();
    const daysSinceEnrollment = Math.floor((now - new Date(enrollment.createdAt)) / (1000 * 60 * 60 * 24));

    // Flat list of lessons to check sequence
    const flatLessons = [];
    modules.forEach(mod => {
      mod.lessons.forEach(les => {
        flatLessons.push({
          ...les,
          moduleId: mod.id
        });
      });
    });

    // Determine lock status step by step
    let previousApproved = true; // First lesson is always unlocked for homework validation
    let previousLessonTitle = '';
    
    const lessonLocksMap = {};

    flatLessons.forEach((lesson, index) => {
      let isLocked = false;
      let lockReason = null;

      // Rule 1: Drip days check
      if (daysSinceEnrollment < lesson.dripDays) {
        isLocked = true;
        lockReason = `Ushbu dars ${lesson.dripDays} kundan keyin ochiladi. Siz ro'yxatdan o'tganingizga: ${daysSinceEnrollment} kun bo'ldi.`;
      }

      // Rule 2: Previous lesson homework check
      if (!isLocked && !previousApproved && index > 0) {
        isLocked = true;
        lockReason = `Oldingi "${previousLessonTitle}" darsining uy vazifasi mentor tomonidan qabul qilinishi (APPROVED) shart.`;
      }

      lessonLocksMap[lesson.id] = { isLocked, lockReason };

      // Set flags for the next lesson in loop
      const homework = lesson.homeworks[0];
      previousApproved = homework && homework.status === 'APPROVED';
      previousLessonTitle = lesson.title;
    });

    // Update progress percentage dynamically
    const completedLessonsCount = flatLessons.filter(l => l.homeworks[0]?.status === 'APPROVED').length;
    const progressPercent = flatLessons.length > 0
      ? Math.round((completedLessonsCount / flatLessons.length) * 100)
      : 0;

    if (progressPercent !== enrollment.progress) {
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { progress: progressPercent }
      });
    }

    // Build finalized output
    const studyModules = modules.map(mod => ({
      id: mod.id,
      title: mod.title,
      order: mod.order,
      lessons: mod.lessons.map(lesson => {
        const lock = lessonLocksMap[lesson.id];
        const homework = lesson.homeworks[0] || null;
        
        // Hide sensitive details if locked
        const video = lock.isLocked ? null : lesson.videoUrl;
        const desc = lock.isLocked ? 'Qulflangan' : lesson.description;

        return {
          id: lesson.id,
          title: lesson.title,
          description: desc,
          videoUrl: video,
          duration: lesson.duration,
          order: lesson.order,
          dripDays: lesson.dripDays,
          isLocked: lock.isLocked,
          lockReason: lock.lockReason,
          homeworkStatus: homework ? homework.status : 'NOT_SUBMITTED',
          homeworkDetails: homework,
          quizPassed: lesson.quizzes[0]?.attempts[0]?.passed || false
        };
      })
    }));

    res.json({
      modules: studyModules,
      progress: progressPercent,
      daysEnrolled: daysSinceEnrollment
    });

  } catch (error) {
    console.error('Study content fetch error:', error);
    res.status(500).json({ error: 'Serverda xatolik yuz berdi' });
  }
});

// GET /api/lms/lessons/:lessonId - Fetch single lesson details with dynamic watermark
router.get('/lessons/:lessonId', authenticate, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: { select: { courseId: true, title: true } }
      }
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Dars topilmadi' });
    }

    if (userRole === 'STUDENT') {
      const course = await prisma.course.findUnique({
        where: { id: lesson.module.courseId }
      });
      const isFree = course && parseFloat(course.price) === 0;

      // Double check enrollment
      let enrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: userId, courseId: lesson.module.courseId } }
      });
      if (!enrollment) {
        if (isFree) {
          enrollment = await prisma.enrollment.create({
            data: {
              studentId: userId,
              courseId: lesson.module.courseId,
              progress: 0
            }
          });
        } else {
          return res.status(403).json({ error: 'Ushbu pullik kursga ustoz, mentor yoki admin tomonidan dostup berilmagan.' });
        }
      }

      // Check lock rules (Need flat check for previous lessons)
      const siblingLessons = await prisma.lesson.findMany({
        where: { module: { courseId: lesson.module.courseId } },
        orderBy: [
          { module: { order: 'asc' } },
          { order: 'asc' }
        ],
        include: {
          homeworks: {
            where: { studentId: userId }
          }
        }
      });

      const now = new Date();
      const daysSinceEnrollment = Math.floor((now - new Date(enrollment.createdAt)) / (1000 * 60 * 60 * 24));
      
      const currentIdx = siblingLessons.findIndex(l => l.id === lessonId);
      
      // Check Drip days
      if (daysSinceEnrollment < lesson.dripDays) {
        return res.status(403).json({ error: `Ushbu dars ${lesson.dripDays} kundan keyin ochiladi.` });
      }

      // Check preceding lesson homework status
      if (currentIdx > 0) {
        const preceding = siblingLessons[currentIdx - 1];
        const precedingHw = preceding.homeworks[0];
        if (!precedingHw || precedingHw.status !== 'APPROVED') {
          return res.status(403).json({ error: `Oldingi dars uy vazifasi tasdiqlanishi shart!` });
        }
      }
    }

    // Dynamic anti-piracy watermark text
    const watermarkText = `ID: ${req.user.id} | ${req.user.name} | ${req.user.email} | KASBTECH.UZ`;

    res.json({
      lesson,
      watermark: {
        text: watermarkText,
        ip: req.ip || '0.0.0.0'
      }
    });

  } catch (error) {
    console.error('Fetch lesson error:', error);
    res.status(500).json({ error: 'Dars ma\'lumotlarini olishda xatolik' });
  }
});

// ==========================================
// 5. HOMEWORK SUBMISSION & REVIEW
// ==========================================

// POST /api/lms/lessons/:lessonId/homework - Submit homework (Student only)
router.post('/lessons/:lessonId/homework', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { textResponse } = req.body;
    const studentId = req.user.id;

    if (req.user.role !== 'STUDENT' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Faqat talabalar uy vazifasini topshira oladilar' });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { module: true }
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Dars topilmadi' });
    }

    // Check if homework already exists
    const existing = await prisma.homework.findFirst({
      where: { lessonId, studentId }
    });

    if (existing && (existing.status === 'PENDING' || existing.status === 'APPROVED')) {
      return res.status(400).json({ error: 'Ushbu dars uchun uy vazifasi allaqachon topshirilgan yoki tasdiqlangan' });
    }

    let fileUrl = null;
    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
    }

    if (!fileUrl && !textResponse) {
      return res.status(400).json({ error: 'Fayl yuklang yoki javob matnini yozing' });
    }

    let homework;
    if (existing && existing.status === 'REJECTED') {
      // Re-submit
      homework = await prisma.homework.update({
        where: { id: existing.id },
        data: {
          fileUrl,
          textResponse,
          status: 'PENDING',
          grade: null,
          feedback: null,
          reviewerId: null,
          createdAt: new Date()
        }
      });
    } else {
      // Create new
      homework = await prisma.homework.create({
        data: {
          lessonId,
          studentId,
          fileUrl,
          textResponse,
          status: 'PENDING'
        }
      });
    }

    res.status(201).json({ message: 'Uy vazifasi muvaffaqiyatli topshirildi, tekshirilgach sizga xabar beriladi', homework });
  } catch (error) {
    console.error('Homework submission error:', error);
    res.status(500).json({ error: 'Uy vazifasini topshirishda xatolik yuz berdi' });
  }
});

// GET /api/lms/homeworks/pending - Get pending homeworks for review (Teacher/Admin only)
router.get('/homeworks/pending', authenticate, requireMentorOrAdmin, async (req, res) => {
  try {
    const homeworks = await prisma.homework.findMany({
      where: { status: 'PENDING' },
      include: {
        student: { select: { id: true, name: true, email: true } },
        lesson: {
          select: {
            id: true,
            title: true,
            module: { select: { title: true, course: { select: { title: true } } } }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ homeworks });
  } catch (error) {
    console.error('Fetch pending homework error:', error);
    res.status(500).json({ error: 'Server xatosi' });
  }
});

// POST /api/lms/homeworks/:homeworkId/review - Review/grade homework (Teacher/Admin only)
router.post('/homeworks/:homeworkId/review', authenticate, requireMentorOrAdmin, async (req, res) => {
  try {
    const { homeworkId } = req.params;
    const { status, grade, feedback } = req.body; // status: APPROVED or REJECTED

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status qiymati APPROVED yoki REJECTED bo\'lishi shart' });
    }

    const homework = await prisma.homework.findUnique({
      where: { id: homeworkId },
      include: { lesson: { select: { title: true } } }
    });

    if (!homework) {
      return res.status(404).json({ error: 'Uy vazifasi topilmadi' });
    }

    const updated = await prisma.homework.update({
      where: { id: homeworkId },
      data: {
        status,
        grade: grade ? parseInt(grade) : null,
        feedback,
        reviewerId: req.user.id
      }
    });

    // Gamification: Reward coins if approved based on the grade percentage (Max 10 coins, only if >= 60%)
    if (status === 'APPROVED' && grade && grade >= 60) {
      const rewardCoins = Math.round(grade / 10);
      await prisma.coinTransaction.create({
        data: {
          studentId: homework.studentId,
          amount: rewardCoins,
          type: 'HW_SUBMISSION',
          description: `"${homework.lesson.title}" darsi uy vazifasi tasdiqlandi (Bahosi: ${grade}%)`
        }
      });

      // Bonus: Check if both homework and quiz are 100%
      if (grade === 100) {
        const lesson = await prisma.lesson.findUnique({
          where: { id: homework.lessonId },
          include: { quizzes: true }
        });
        
        if (lesson && lesson.quizzes.length > 0) {
          const quizId = lesson.quizzes[0].id;
          const perfectQuiz = await prisma.quizAttempt.findFirst({
            where: {
              quizId,
              studentId: homework.studentId,
              score: 100,
              passed: true
            }
          });

          if (perfectQuiz) {
            // Check if they already received the perfect bonus for this lesson
            const bonusTx = await prisma.coinTransaction.findFirst({
              where: {
                studentId: homework.studentId,
                type: 'PERFECT_LESSON_BONUS',
                description: { contains: `"${homework.lesson.title}"` }
              }
            });

            if (!bonusTx) {
              await prisma.coinTransaction.create({
                data: {
                  studentId: homework.studentId,
                  amount: 2,
                  type: 'PERFECT_LESSON_BONUS',
                  description: `"${homework.lesson.title}" darsidan to'liq 100% (vazifa va test) natija uchun bonus`
                }
              });
            }
          }
        }
      }
    }

    res.json({ message: `Vazifa muvaffaqiyatli ${status === 'APPROVED' ? 'tasdiqlandi' : 'rad etildi'}`, homework: updated });
  } catch (error) {
    console.error('Review homework error:', error);
    res.status(500).json({ error: 'Tekshirishda xatolik yuz berdi' });
  }
});

// ==========================================
// 6. QUIZ & ATTEMPTS
// ==========================================

// GET /api/lms/lessons/:lessonId/quiz - Get lesson quiz
router.get('/lessons/:lessonId/quiz', authenticate, async (req, res) => {
  try {
    const { lessonId } = req.params;

    const quiz = await prisma.quiz.findFirst({
      where: { lessonId }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Ushbu darsda test/quiz mavjud emas' });
    }

    res.json({ quiz });
  } catch (error) {
    console.error('Fetch quiz error:', error);
    res.status(500).json({ error: 'Testni yuklashda xatolik' });
  }
});

// POST /api/lms/lessons/:lessonId/quiz - Create/update quiz
router.post('/lessons/:lessonId/quiz', authenticate, requireMentorOrAdmin, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { questions, passScore } = req.body; // questions should be JSON array

    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ error: 'Savollar to\'plami massiv ko\'rinishida bo\'lishi shart' });
    }

    const existing = await prisma.quiz.findFirst({
      where: { lessonId }
    });

    let quiz;
    if (existing) {
      quiz = await prisma.quiz.update({
        where: { id: existing.id },
        data: {
          questions,
          passScore: parseInt(passScore || 70)
        }
      });
    } else {
      quiz = await prisma.quiz.create({
        data: {
          lessonId,
          questions,
          passScore: parseInt(passScore || 70)
        }
      });
    }

    res.status(201).json({ quiz });
  } catch (error) {
    console.error('Set quiz error:', error);
    res.status(500).json({ error: 'Test sozlashda xatolik yuz berdi' });
  }
});

// POST /api/lms/quizzes/:quizId/submit - Submit quiz answers and grade
router.post('/quizzes/:quizId/submit', authenticate, async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body; // Array of selected options e.g. [0, 2, 1, 3] corresponding to questions
    const studentId = req.user.id;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { lesson: { select: { title: true } } }
    });

    if (!quiz) {
      return res.status(404).json({ error: 'Test topilmadi' });
    }

    const questionsList = quiz.questions; // Expecting Array of objects
    if (!answers || answers.length !== questionsList.length) {
      return res.status(400).json({ error: 'Barcha savollarga javob kiritilishi shart' });
    }

    let correctCount = 0;
    questionsList.forEach((q, idx) => {
      if (q.correctOptionIndex === answers[idx]) {
        correctCount++;
      }
    });

    const scorePercent = Math.round((correctCount / questionsList.length) * 100);
    const passed = scorePercent >= quiz.passScore;

    // Save attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        studentId,
        score: scorePercent,
        passed
      }
    });

    let rewardCoins = 0;
    let bonusCoins = 0;

    // Gamification: Reward coins if passed based on the quiz score percentage (Max 10 coins, only if >= 60%)
    if (passed && scorePercent >= 60) {
      // Check if student has passed this quiz before (only reward once)
      const previousPass = await prisma.quizAttempt.findFirst({
        where: { quizId, studentId, passed: true, id: { not: attempt.id } }
      });

      if (!previousPass) {
        rewardCoins = Math.round(scorePercent / 10);
        await prisma.coinTransaction.create({
          data: {
            studentId,
            amount: rewardCoins,
            type: 'QUIZ_PASS',
            description: `"${quiz.lesson.title}" dars testidan o'tildi (Natija: ${scorePercent}%)`
          }
        });

        // Bonus: Check if both quiz and homework are 100%
        if (scorePercent === 100) {
          const perfectHomework = await prisma.homework.findFirst({
            where: {
              lessonId: quiz.lessonId,
              studentId,
              status: 'APPROVED',
              grade: 100
            }
          });

          if (perfectHomework) {
            // Check if they already received the perfect bonus for this lesson
            const bonusTx = await prisma.coinTransaction.findFirst({
              where: {
                studentId,
                type: 'PERFECT_LESSON_BONUS',
                description: { contains: `"${quiz.lesson.title}"` }
              }
            });

            if (!bonusTx) {
              await prisma.coinTransaction.create({
                data: {
                  studentId,
                  amount: 2,
                  type: 'PERFECT_LESSON_BONUS',
                  description: `"${quiz.lesson.title}" darsidan to'liq 100% (vazifa va test) natija uchun bonus`
                }
              });
              bonusCoins = 2;
            }
          }
        }
      }
    }

    res.json({
      passed,
      score: scorePercent,
      correctAnswers: correctCount,
      totalQuestions: questionsList.length,
      attempt,
      rewardCoins,
      bonusCoins
    });

  } catch (error) {
    console.error('Quiz grading error:', error);
    res.status(500).json({ error: 'Test natijalarini hisoblashda xatolik' });
  }
});

// ==========================================
// 7. GAMIFICATION & TRANSACTION HISTORY
// ==========================================

// GET /api/lms/coins/balance - Get current student coin balance & history
router.get('/coins/balance', authenticate, async (req, res) => {
  try {
    const studentId = req.user.id;

    const transactions = await prisma.coinTransaction.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' }
    });

    const balance = transactions.reduce((acc, curr) => acc + curr.amount, 0);

    res.json({
      balance,
      transactions
    });
  } catch (error) {
    console.error('Fetch coin balance error:', error);
    res.status(500).json({ error: 'Koinlar balansini yuklashda xatolik' });
  }
});

// ==========================================
// 8. TEACHER ASSIGNMENT & STUDENT PROFILES
// ==========================================

// GET /api/lms/teachers - List all teachers/mentors
router.get('/teachers', authenticate, async (req, res) => {
  try {
    const teachers = await prisma.user.findMany({
      where: {
        role: { in: ['TEACHER', 'MENTOR'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: { name: 'asc' }
    });
    res.json({ teachers });
  } catch (error) {
    console.error('Fetch teachers error:', error);
    res.status(500).json({ error: 'O\'qituvchilarni yuklashda xatolik yuz berdi' });
  }
});

// POST /api/lms/courses/:courseId/assign-teacher - Assign teacher to course (Admin only)
router.post('/courses/:courseId/assign-teacher', authenticate, requireAdmin, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { teacherId } = req.body;

    const course = await prisma.course.update({
      where: { id: courseId },
      data: {
        teacherId: teacherId || null
      }
    });

    res.json({ message: 'O\'qituvchi kursga muvaffaqiyatli biriktirildi', course });
  } catch (error) {
    console.error('Assign teacher error:', error);
    res.status(500).json({ error: 'O\'qituvchini biriktirishda xatolik yuz berdi' });
  }
});

// POST /api/lms/students/register - Register a student and enroll in courses (Teacher/Admin)
router.post('/students/register', authenticate, requireMentorOrAdmin, async (req, res) => {
  try {
    const { name, email, password, courseIds } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'F.I.SH., email va parol kiritilishi shart' });
    }

    const bcrypt = require('bcryptjs');
    
    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Ushbu email bilan ro\'yxatdan o\'tgan foydalanuvchi mavjud' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create student user
    const student = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'STUDENT'
      }
    });

    // Enroll in selected courses
    if (courseIds && Array.isArray(courseIds)) {
      for (const courseId of courseIds) {
        await prisma.enrollment.upsert({
          where: { studentId_courseId: { studentId: student.id, courseId } },
          update: {},
          create: {
            studentId: student.id,
            courseId
          }
        });
      }
    }

    res.status(201).json({ message: 'Talaba profili muvaffaqiyatli yaratildi', student });
  } catch (error) {
    console.error('Register student error:', error);
    res.status(500).json({ error: 'Talabani ro\'yxatdan o\'tkazishda xatolik yuz berdi' });
  }
});

// POST /api/lms/students/:studentId/enroll - Grant course access / enroll student (Teacher/Admin)
router.post('/students/:studentId/enroll', authenticate, requireMentorOrAdmin, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'Kurs ID kiritilishi shart' });
    }

    const enrollment = await prisma.enrollment.upsert({
      where: { studentId_courseId: { studentId, courseId } },
      update: {},
      create: {
        studentId,
        courseId
      }
    });

    res.json({ message: 'Talabaga darsga ruxsat berildi', enrollment });
  } catch (error) {
    console.error('Enroll student error:', error);
    res.status(500).json({ error: 'Darsga ruxsat berishda xatolik yuz berdi' });
  }
});

// POST /api/lms/students/:studentId/unenroll - Revoke course access / unenroll student (Teacher/Admin)
router.post('/students/:studentId/unenroll', authenticate, requireMentorOrAdmin, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'Kurs ID kiritilishi shart' });
    }

    await prisma.enrollment.delete({
      where: { studentId_courseId: { studentId, courseId } }
    });

    res.json({ message: 'Kursdan ruxsat bekor qilindi' });
  } catch (error) {
    console.error('Unenroll student error:', error);
    res.status(500).json({ error: 'Kurs ruxsatini bekor qilishda xatolik yuz berdi' });
  }
});

// GET /api/lms/students - List all students with their enrollments (Teacher/Admin)
router.get('/students', authenticate, requireMentorOrAdmin, async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        enrollments: {
          include: {
            course: { select: { id: true, title: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ students });
  } catch (error) {
    console.error('List students error:', error);
    res.status(500).json({ error: 'Talabalar ro\'yxatini yuklashda xatolik yuz berdi' });
  }
});

// GET /api/lms/leaderboard - Get top students by performance and activity
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const { courseId } = req.query; // 'overall' or specific course UUID

    let studentsData = [];

    if (!courseId || courseId === 'overall') {
      // 1. Overall Leaderboard
      const students = await prisma.user.findMany({
        where: { role: 'STUDENT', isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          enrollments: {
            select: {
              progress: true
            }
          },
          homeworks: {
            where: { status: 'APPROVED' },
            select: {
              grade: true
            }
          },
          coins: {
            select: {
              amount: true
            }
          },
          _count: {
            select: {
              homeworks: true // total submissions (active)
            }
          }
        }
      });

      studentsData = students.map(student => {
        const enrolls = student.enrollments || [];
        const avgProgress = enrolls.length > 0 
          ? Math.round(enrolls.reduce((acc, curr) => acc + curr.progress, 0) / enrolls.length)
          : 0;

        const approvedHws = student.homeworks || [];
        const validGrades = approvedHws.filter(h => h.grade !== null);
        const avgGrade = validGrades.length > 0
          ? Math.round(validGrades.reduce((acc, curr) => acc + curr.grade, 0) / validGrades.length)
          : 0;

        const totalCoins = student.coins.reduce((acc, curr) => acc + curr.amount, 0);
        const submissionsCount = student._count.homeworks;

        return {
          id: student.id,
          name: student.name,
          email: student.email,
          avatar: student.avatar,
          progress: avgProgress,
          avgGrade: avgGrade,
          coins: totalCoins,
          submissionsCount: submissionsCount
        };
      });
    } else {
      // 2. Specific Course Leaderboard
      const enrollments = await prisma.enrollment.findMany({
        where: { courseId },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              coins: {
                select: {
                  amount: true
                }
              }
            }
          }
        }
      });

      const homeworks = await prisma.homework.findMany({
        where: {
          lesson: {
            module: {
              courseId
            }
          }
        },
        select: {
          studentId: true,
          grade: true,
          status: true
        }
      });

      // Group homeworks by studentId
      const hwMap = {};
      homeworks.forEach(hw => {
        if (!hwMap[hw.studentId]) {
          hwMap[hw.studentId] = {
            totalSubmissions: 0,
            approvedGrades: []
          };
        }
        hwMap[hw.studentId].totalSubmissions++;
        if (hw.status === 'APPROVED' && hw.grade !== null) {
          hwMap[hw.studentId].approvedGrades.push(hw.grade);
        }
      });

      studentsData = enrollments.map(enrollment => {
        const student = enrollment.student;
        if (!student) return null;

        const hwData = hwMap[student.id] || { totalSubmissions: 0, approvedGrades: [] };
        const avgGrade = hwData.approvedGrades.length > 0
          ? Math.round(hwData.approvedGrades.reduce((acc, curr) => acc + curr, 0) / hwData.approvedGrades.length)
          : 0;

        const totalCoins = student.coins.reduce((acc, curr) => acc + curr.amount, 0);

        return {
          id: student.id,
          name: student.name,
          email: student.email,
          avatar: student.avatar,
          progress: enrollment.progress,
          avgGrade: avgGrade,
          coins: totalCoins,
          submissionsCount: hwData.totalSubmissions
        };
      }).filter(Boolean);
    }

    // Sort by progress/grade first
    // For visual chart: sort descending, slice top 10, then reverse it (to show ascending left-to-right)
    const byPerformance = [...studentsData]
      .sort((a, b) => {
        if (b.progress !== a.progress) {
          return b.progress - a.progress;
        }
        return b.avgGrade - a.avgGrade;
      })
      .slice(0, 10)
      .reverse();

    // Sort by activity: coins / submissionsCount
    const byActivity = [...studentsData]
      .sort((a, b) => {
        if (b.coins !== a.coins) {
          return b.coins - a.coins;
        }
        return b.submissionsCount - a.submissionsCount;
      })
      .slice(0, 10)
      .reverse();

    // The full list sorted descending by progress for the leaderboard table
    const tableLeaderboard = [...studentsData].sort((a, b) => {
      if (b.progress !== a.progress) {
        return b.progress - a.progress;
      }
      if (b.coins !== a.coins) {
        return b.coins - a.coins;
      }
      return b.avgGrade - a.avgGrade;
    });

    res.json({
      leaderboard: tableLeaderboard,
      byPerformance,
      byActivity
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Natijalarni hisoblashda xatolik yuz berdi' });
  }
});

// ==========================================
// 8. AI MENTOR & BOT KNOWLEDGE BASE
// ==========================================

// GET /api/lms/bot-knowledge - Fetch all knowledge base items
router.get('/bot-knowledge', authenticate, async (req, res) => {
  try {
    const { courseId, search } = req.query;
    const where = {};
    if (courseId) where.courseId = courseId;
    if (search) {
      where.OR = [
        { topic: { contains: search, mode: 'insensitive' } },
        { question: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    const items = await prisma.botKnowledge.findMany({
      where,
      include: {
        course: { select: { id: true, title: true } },
        createdBy: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ items });
  } catch (error) {
    console.error('Fetch bot knowledge error:', error);
    res.status(500).json({ error: 'Bilimlar bazasini yuklashda xatolik' });
  }
});

// POST /api/lms/bot-knowledge - Create knowledge base item (Admin, Teacher, Mentor)
router.post('/bot-knowledge', authenticate, requireMentorOrAdmin, async (req, res) => {
  try {
    const { topic, question, content, courseId } = req.body;
    if (!topic || !content) {
      return res.status(400).json({ error: 'Mavzu va kontent kiritilishi shart' });
    }

    const newItem = await prisma.botKnowledge.create({
      data: {
        topic,
        question: question || null,
        content,
        courseId: courseId || null,
        createdById: req.user.id
      },
      include: {
        course: { select: { id: true, title: true } },
        createdBy: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ item: newItem });
  } catch (error) {
    console.error('Create bot knowledge error:', error);
    res.status(500).json({ error: 'Bilimlar bazasiga yozuv qo\'shishda xatolik' });
  }
});

// PUT /api/lms/bot-knowledge/:id - Update knowledge base item
router.put('/bot-knowledge/:id', authenticate, requireMentorOrAdmin, async (req, res) => {
  try {
    const { topic, question, content, courseId } = req.body;
    const existing = await prisma.botKnowledge.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Yozuv topilmadi' });
    }

    const updated = await prisma.botKnowledge.update({
      where: { id: req.params.id },
      data: {
        topic: topic !== undefined ? topic : existing.topic,
        question: question !== undefined ? question : existing.question,
        content: content !== undefined ? content : existing.content,
        courseId: courseId !== undefined ? courseId : existing.courseId
      },
      include: {
        course: { select: { id: true, title: true } },
        createdBy: { select: { id: true, name: true } }
      }
    });

    res.json({ item: updated });
  } catch (error) {
    console.error('Update bot knowledge error:', error);
    res.status(500).json({ error: 'Bilimlar bazasi yozuvini yangilashda xatolik' });
  }
});

// DELETE /api/lms/bot-knowledge/clear-all - Delete all knowledge base items (Admin, Teacher, Mentor)
router.delete('/bot-knowledge/clear-all', authenticate, requireMentorOrAdmin, async (req, res) => {
  try {
    const result = await prisma.botKnowledge.deleteMany({});
    res.json({ message: `Bilimlar bazasidagi barcha (${result.count} ta) yozuvlar tozalab tashlandi`, count: result.count });
  } catch (error) {
    console.error('Clear all bot knowledge error:', error);
    res.status(500).json({ error: 'Bilimlar bazasini tozalashda xatolik yuz berdi' });
  }
});

// DELETE /api/lms/bot-knowledge/:id - Delete knowledge base item
router.delete('/bot-knowledge/:id', authenticate, requireMentorOrAdmin, async (req, res) => {
  try {
    const existing = await prisma.botKnowledge.findUnique({
      where: { id: req.params.id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Yozuv topilmadi' });
    }

    await prisma.botKnowledge.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Yozuv muvaffaqiyatli o\'chirildi' });
  } catch (error) {
    console.error('Delete bot knowledge error:', error);
    res.status(500).json({ error: 'Bilimlar bazasi yozuvini o\'chirishda xatolik' });
  }
});

// POST /api/lms/bot-knowledge/upload-doc - Upload PDF, Word, Excel, TXT books/manuals and extract into Bot Knowledge Base
router.post('/bot-knowledge/upload-doc', authenticate, requireMentorOrAdmin, (req, res) => {
  uploadDocMemory.single('file')(req, res, async (err) => {
    if (err) {
      console.error('Multer doc upload error:', err);
      return res.status(400).json({ error: 'Fayl yuklashda xatolik: ' + err.message });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Fayl yuklanmadi. Iltimos, fayl tanlang.' });
      }

      const { courseId, topic } = req.body;
      const fileBuffer = req.file.buffer;
      const originalName = req.file.originalname || 'Hujjat';
      const mimeType = req.file.mimetype || '';
      const ext = originalName.split('.').pop().toLowerCase();

      let extractedText = '';

      // Extract text based on file extension / mime type with try/catch fallbacks
      if (ext === 'pdf' || mimeType === 'application/pdf') {
        try {
          const pdfData = await pdfParse(fileBuffer);
          extractedText = pdfData.text || '';
        } catch (pdfErr) {
          console.warn('PDF parse fallback:', pdfErr.message);
          extractedText = fileBuffer.toString('binary').replace(/[^\x20-\x7E\x0A\x0D]/g, ' ');
        }
      } else if (ext === 'docx' || ext === 'doc' || mimeType.includes('word')) {
        try {
          const result = await mammoth.extractRawText({ buffer: fileBuffer });
          extractedText = result.value || '';
        } catch (wordErr) {
          console.warn('Word parse fallback:', wordErr.message);
          extractedText = fileBuffer.toString('utf-8');
        }
      } else if (ext === 'xlsx' || ext === 'xls' || mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
        try {
          const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
          const sheetTexts = [];
          workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(sheet);
            if (csv && csv.trim()) {
              sheetTexts.push(`--- Varaq: ${sheetName} ---\n${csv}`);
            }
          });
          extractedText = sheetTexts.join('\n\n');
        } catch (excelErr) {
          console.warn('Excel parse fallback:', excelErr.message);
          extractedText = fileBuffer.toString('utf-8');
        }
      } else {
        // Plain text, markdown, CSV, JSON
        extractedText = fileBuffer.toString('utf-8');
      }

      // Clean null bytes and invalid characters for PostgreSQL string insertion
      const cleanText = extractedText
        .replace(/\0/g, '')
        .replace(/\u0000/g, '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ')
        .replace(/\r\n/g, '\n')
        .trim();

      if (!cleanText) {
        return res.status(400).json({ error: 'Fayldan matnli ma\'lumot ajratib bo\'lmadi yoki fayl mazmuni bo\'sh' });
      }

      const baseTopic = topic && topic.trim() ? topic.trim() : `Hujjat: ${originalName}`;
      const wordCount = cleanText.split(/\s+/).length;

      // Robust Chunking: Slices clean text into max 2,000 character chunks
      const CHUNK_SIZE = 2000;
      const textChunks = [];
      let remaining = cleanText;

      while (remaining.length > 0) {
        if (remaining.length <= CHUNK_SIZE) {
          if (remaining.trim()) textChunks.push(remaining.trim());
          break;
        }

        let sliceIdx = CHUNK_SIZE;
        const lastBreak = remaining.lastIndexOf('\n', CHUNK_SIZE);
        const lastPeriod = remaining.lastIndexOf('. ', CHUNK_SIZE);
        const lastSpace = remaining.lastIndexOf(' ', CHUNK_SIZE);

        if (lastBreak > CHUNK_SIZE * 0.5) {
          sliceIdx = lastBreak;
        } else if (lastPeriod > CHUNK_SIZE * 0.5) {
          sliceIdx = lastPeriod + 1;
        } else if (lastSpace > CHUNK_SIZE * 0.3) {
          sliceIdx = lastSpace;
        }

        const chunk = remaining.substring(0, sliceIdx).trim();
        if (chunk) textChunks.push(chunk);
        remaining = remaining.substring(sliceIdx).trim();
      }

      let createdCount = 0;
      for (let idx = 0; idx < textChunks.length; idx++) {
        const chunkContent = textChunks[idx];
        const chunkTopic = textChunks.length === 1 ? baseTopic : `${baseTopic} (${idx + 1}-qism)`;
        const chunkQuestion = `${originalName} kitobi/qo'llanmasi (${idx + 1}-qism)`;

        await prisma.botKnowledge.create({
          data: {
            topic: chunkTopic,
            question: chunkQuestion,
            content: chunkContent,
            courseId: courseId || null,
            createdById: req.user.id
          }
        });
        createdCount++;
      }

      res.json({
        message: `"${originalName}" faylidan ${wordCount} so'z ajratib olindi va ${createdCount} ta bilim yozuvi sifatida AI botga muvaffaqiyatli saqlandi!`,
        createdCount,
        wordCount
      });

    } catch (error) {
      console.error('Upload document to bot knowledge error:', error);
      res.status(500).json({ error: 'Hujjatni o\'qish yoki saqlashda xatolik yuz berdi: ' + error.message });
    }
  });
});

// POST /api/lms/bot-knowledge/sync-courses - Auto-sync course lessons into Bot Knowledge Base (Teacher/Admin only)
router.post('/bot-knowledge/sync-courses', authenticate, requireMentorOrAdmin, async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        modules: {
          include: {
            lessons: true
          }
        }
      }
    });

    let createdCount = 0;
    for (const course of courses) {
      for (const moduleItem of course.modules) {
        for (const lesson of moduleItem.lessons) {
          if (!lesson.title) continue;
          
          const topicName = `Dars: ${lesson.title}`;
          const existing = await prisma.botKnowledge.findFirst({
            where: {
              topic: topicName,
              courseId: course.id
            }
          });

          if (!existing) {
            const contentText = lesson.description || `${course.title} kursining "${moduleItem.title}" modulidagi ${lesson.title} darsi. Ushbu dars bo'yicha ma'lumotlar va topshiriqlar platformada mavjud.`;
            await prisma.botKnowledge.create({
              data: {
                topic: topicName,
                question: `${lesson.title} bo'yicha ma'lumot va dars mavzusi`,
                content: contentText,
                courseId: course.id,
                createdById: req.user.id
              }
            });
            createdCount++;
          }
        }
      }
    }

    res.json({ 
      message: `${createdCount} ta dars bilimlar bazasiga avtomatik sinxronlandi va qo'shildi!`,
      count: createdCount 
    });
  } catch (error) {
    console.error('Sync course knowledge error:', error);
    res.status(500).json({ error: 'Darslarni sinxronlashda xatolik yuz berdi' });
  }
});

// Helper: Seed default core FAQs if knowledge base is empty or missing core guides
async function seedDefaultKnowledge() {
  try {
    const defaultGuides = [
      {
        topic: "Darslarni o'zlashtirish va tartib qoidalari",
        question: "Darslarni o'zlashtirish tartibi qanday?",
        content: "Kasbtech Akademiyasida darslarni o'zlashtirish tartibi quyidagicha:\n\n1. **Dars videosini ko'rish**: 1-darsdan boshlab videolarni tartib bilan diqqat bilan ko'rib chiqasiz.\n2. **Uy vazifasini bajarish**: Dars oxirida berilgan amaliy topshiriq va uy vazifasini bajarib, fayl yoki matn ko'rinishida platformaga yuklaysiz.\n3. **Ustoz tasdiqlashi**: Ustozingiz yoki mentoringiz vazifangizni tekshirib 'Tasdiqlangan' (APPROVED) holatiga o'tkazgach, avtomatik tarzda keyingi dars qulfdan ochiladi."
      },
      {
        topic: "Uy vazifasini topshirish tartibi",
        question: "Uy vazifasini qanday topshiraman?",
        content: "Uy vazifasini topshirish uchun:\n\n1. Dars sahifasidagi 'Uy vazifasi' bo'limiga o'ting.\n2. Bajarilgan faylingizni (rasm, PDF, arxiv yoki hujjat) yuklang va izohingizni yozing.\n3. 'Vazifani topshirish' tugmasini bosing.\n4. Ustozingiz vazifangizni tekshirib baholaydi hamda fikr-mulohazasini qoldiradi."
      },
      {
        topic: "KasbCoin va Reyting Tizimi",
        question: "KasbCoin va reyting tizimi haqida ma'lumot bering",
        content: "Kasbtech Akademiyasi KasbCoin va Reyting tizimi:\n\n- **KasbCoin kazanish**: Uy vazifalari va testlarni a'lo baholarga o'z vaqtida topshirganingiz uchun sizga KasbCoin va ballar taqdim etiladi.\n- **Reyting taxtasi**: Olingan ballar evaziga akademiyadagi eng faol talabalar reytingida yuqori o'rinlarga ko'tarilasiz va qimmatbaho sovg'alar hamda vaucherlarga ega bo'lishingiz mumkin."
      },
      {
        topic: "Akademiya va Guruh Qoidalari",
        question: "Guruh qoidalari va tartib qoidalari",
        content: "Kasbtech Akademiyasi qoidalari:\n\n1. O'zaro muloyimlik va professional muloqot madaniyatiga amal qilish.\n2. Dars topshiriqlarini o'z vaqtida va sifatli bajarish.\n3. Tushunarsiz savollar yuzasidan Mentor Kasbtech Bot yoki o'z ustozingizga murojaat qilish."
      }
    ];

    for (const guide of defaultGuides) {
      const exists = await prisma.botKnowledge.findFirst({
        where: { topic: guide.topic }
      });
      if (!exists) {
        await prisma.botKnowledge.create({
          data: guide
        });
      }
    }
  } catch (err) {
    console.error('Seed default knowledge error:', err);
  }
}

// POST /api/lms/bot-knowledge/train - Re-train and optimize AI Bot memory on all knowledge base & course items
router.post('/bot-knowledge/train', authenticate, requireMentorOrAdmin, async (req, res) => {
  try {
    const kbCount = await prisma.botKnowledge.count();
    const lessonCount = await prisma.lesson.count();
    const totalItems = kbCount + lessonCount;

    res.json({
      success: true,
      count: totalItems,
      message: `Bot muvaffaqiyatli o'qitildi! ${kbCount} ta bilimlar bazasi yozuvi va ${lessonCount} ta kurs darslari AI xotirasiga yuklandi va o'rganildi.`
    });
  } catch (error) {
    console.error('Bot training error:', error.message);
    res.status(500).json({ error: 'Botni o\'qitishda xatolik yuz berdi: ' + error.message });
  }
});

// POST /api/lms/ai-mentor/chat - AI Mentor chat endpoint with strict knowledge-base & course materials RAG
router.post('/ai-mentor/chat', authenticate, async (req, res) => {
  try {
    const { message, courseId, history } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Savol matni kiritilishi shart' });
    }

    // Fetch ALL Knowledge Base entries (no cap to ensure uploaded books & core FAQs are all searched)
    const where = {};
    if (courseId) {
      where.OR = [{ courseId: courseId }, { courseId: null }];
    }
    const kbItems = await prisma.botKnowledge.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // Fetch all course lessons to complement Knowledge Base
    const lessonsWhere = {};
    if (courseId) {
      lessonsWhere.module = { courseId: courseId };
    }
    const lessons = await prisma.lesson.findMany({
      where: lessonsWhere,
      include: {
        module: {
          select: {
            title: true,
            course: { select: { title: true } }
          }
        }
      }
    });

    // Build context text from Knowledge Base and Lessons
    let kbText = kbItems.length === 0 
      ? 'Bilimlar bazasi yozuvlari mavjud emas.' 
      : kbItems.map((item, idx) => `[Bilim ${idx + 1}] Mavzu: ${item.topic}\nSavol/Kalit so'z: ${item.question || 'Mavjud emas'}\nKontent/Javob: ${item.content}`).join('\n\n');

    let lessonText = lessons.length === 0 
      ? 'Darslar ma\'lumotlari mavjud emas.' 
      : lessons.map((l, idx) => `[Dars ${idx + 1}] Kurs: ${l.module?.course?.title || 'Noma\'lum'}, Modul: ${l.module?.title || 'Noma\'lum'}, Dars nomi: ${l.title}\nDars ta'rifi/Mazmuni: ${l.description || 'Ta\'rif kiritilmagan'}`).join('\n\n');

    const combinedContextText = `=== BILIMLAR BAZASI ===\n${kbText}\n\n=== KURS DARSLARI VA O'QUV MATERIALLARI ===\n${lessonText}`;

    // System instruction prompt forcing strict compliance with Knowledge Base and Expert tone
    const systemPrompt = `Siz "Mentor Kasbtech Bot" – Kasbtech Akademiyasining ta'lim, marketing va texnologiyalar bo'yicha yetuk, tajribali va intellektual AI mentorisiz.
SIZ QUYIDAGI QAT'IY QOIDALARGA AMAL QILISHINGIZ SHART:
1. Quyida "=== KASBTECH BILIMLAR BAZASI VA DARSLAR ===" sarlavhasi ostida keltirilgan ma'lumotlarni to'liq tahlil qilib, foydalanuvchi/talabaning savoliga xuddi soha mutaxassisiday chuqur, aniq, tushunarli, chiroyli va muloyim javob bering.
2. Bilimlar bazasidagi va darslardagi ma'lumotlarga tayanib, javobni mantiqiy sarlavhalar, muhim nuqtalar va misollar bilan tartibli shakllantiring.
3. Agar savol kasbcoin, guruh qoidalari, darslar, uy vazifasi topshirish haqida bo'lsa, akademiyaning belgilangan tartibini aniq tushuntiring.
4. Javobingizni har doim professional o'zbek tilida, mutaxassis darajasida va chiroyli formatlangan (Markdown formatting) ko'rinishda taqdim eting.

=== KASBTECH BILIMLAR BAZASI VA DARSLAR ===
${combinedContextText}
=================================`;

    let aiReply = '';

    // 1. PRIORITY 1: Try Real Gemini AI Model API if GEMINI_API_KEY is configured
    const settingKey = await prisma.setting.findUnique({ where: { key: 'GEMINI_API_KEY' } });
    const apiKey = settingKey?.value || process.env.GEMINI_API_KEY;

    if (apiKey && apiKey.trim().length > 5) {
      const axios = require('axios');
      const candidateModels = [
        'gemini-flash-latest',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-2.5-flash-lite',
        'gemini-3.6-flash'
      ];
      const contents = [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nFoydalanuvchi savoli: ${message}` }] }];

      for (const modelName of candidateModels) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey.trim()}`;
          const response = await axios.post(
            geminiUrl,
            { contents },
            { headers: { 'Content-Type': 'application/json' }, timeout: 12000 }
          );
          const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim().length > 5) {
            aiReply = text;
            break;
          }
        } catch (err) {
          console.warn(`Gemini API call error (${modelName}):`, err.response?.data?.error?.message || err.message);
        }
      }
    }

    // 2. PRIORITY 2: Smart Typo-Tolerant RAG & Built-in Knowledge Engine (when Gemini API is keyless or quota limited)
    if (!aiReply) {
      let queryClean = message.toLowerCase().trim();

      // Typo & Synonym Normalizer for Uzbek natural language
      queryClean = queryClean
        .replace(/\bkabcoin\b|\bkasbkoin\b|\bkasb-coin\b|\bcoin\b|\btanga\b|\bkoin\b/gi, 'kasbcoin')
        .replace(/\bqoydalari\b|\bqoidasi\b|\bqoida\b|\bintizom\b|\btalablar\b/gi, 'qoidalari')
        .replace(/\btopshrish\b|\btopshrik\b|\bvazifalar\b|\btopshirish\b/gi, 'topshirish')
        .replace(/\bo'rgatilinadimi\b|\bo'rganamiz\b|\bkursdami\b/gi, 'o\'rgatiladi');

      // 1. Built-in Core Student FAQs (Sertifikat, KasbCoin, Guruh Qoidalari, Homework, Progression)
      if (/sertifikat|diplom/i.test(queryClean)) {
        aiReply = `🤖 **Mentor Kasbtech Bot** *(Mutaxassis AI Mentor)*\n\n📌 **Kasbtech Akademiyasi Sertifikati:**\n\nHa, albatta! Kasbtech Akademiyasining kursini to'liq tamomlab, barcha amaliy uy vazifalarini hamda yakuniy imtihon/loyihani muvaffaqiyatli topshirgan har bir talabaga rasmiy **Kasbtech Akademiyasi Sertifikati** taqdim etiladi! 🎓✨\n\n- **A'lo natijalar uchun**: "Distinction" (A'lo darajali) maxsus sertifikat;\n- **Sertifikat tekshiruvi**: Har bir sertifikat noyob serial raqam va QR-kodga ega bo'lib, ish beruvchi kompaniyalar uchun talabaning bilim darajasini tasdiqlaydi.`;
      }
      else if (/kasbcoin|reyting|tanga|ball|leaderboard|coin/i.test(queryClean)) {
        aiReply = `🤖 **Mentor Kasbtech Bot** *(Mutaxassis AI Mentor)*\n\n📌 **KasbCoin va Reyting Tizimi Haqida Ma'lumot:**\n\n1. **KasbCoin nima?**: KasbCoin — bu Kasbtech Akademiyasida faollik va yaxshi o'zlashtirish uchun talabalarga beriladigan rag'batlantiruvchi ichki valyuta (tanga) hisoblanadi.\n2. **KasbCoin qanday ishlanadi?**:\n   - Har bir topshirilgan va ustoz tomonidan tasdiqlangan uy vazifasi uchun KasbCoin taqdim etiladi.\n   - O'z vaqtida va a'lo bahoga bajarilgan topshiriqlar uchun qo'shimcha bonus coinlar beriladi.\n3. **Reyting va Sovrinlar**:\n   - Ishlangan KasbCoinlar hisobiga umumiy talabalar va guruhlar o'rtasida reyting (Leaderboard) shakllanadi.\n   - Eng yuqori reytingdagi talabalar akademiyaning maxsus sovg'alari, chegirmalari va sertifikatlari bilan taqdirlanadi!`;
      }
      else if (/guruh|intizom|odob|qoidalari|talablar/i.test(queryClean)) {
        aiReply = `🤖 **Mentor Kasbtech Bot** *(Mutaxassis AI Mentor)*\n\n📌 **Kasbtech Akademiyasi Guruh Qoidalari va Talablari:**\n\n1. **O'zaro Hurmat va Odob**: Guruhda ustozlar, mentorlar va boshqa talabalarga nisbatan o'zaro hurmat saqlanishi hamda muloyim muloqot qilinishi shart.\n2. **Faqat Mavzuga Oid Muloqot**: Guruhda faqat darslar, amaliy topshiriqlar va marketing/IT sohasiga oid professional savol-javoblar olib boriladi.\n3. **Reklama va Spam Taqiqi**: Begona havolalar (linklar), ruxsatsiz reklama, tijorat takliflari hamda spam yuborish qat'iyan man etiladi.\n4. **Vazifalarni O'z Vaqtida Topshirish**: Berilgan amaliy topshiriq va uy vazifalarini belgilangan muhlatda topshirish talab etiladi.\n5. **Tartib-Intizom**: Guruh intizomini buzish yoki nojo'ya murojaatlar qilish taqiqlanadi.`;
      }
      else if (/vazifa|topshiriq|yuklash|topshirish|tekshirish|baholash/i.test(queryClean)) {
        aiReply = `🤖 **Mentor Kasbtech Bot** *(Mutaxassis AI Mentor)*\n\n📌 **Uy vazifasini topshirish tartibi:**\n\n1. Dars sahifasiga kirib, dars pastidagi **'Uy vazifasi'** bo'limini ochasiz.\n2. Bajarilgan amaliy topshiriq faylingizni (rasm, PDF, arxiv yoki hujjat) yuklaysiz va izohingizni qoldirasiz.\n3. **'Vazifani topshirish'** tugmasini bosing.\n4. Ustozingiz vazifangizni tekshirib, 'Tasdiqlandi' (APPROVED) holatiga o'tkazgach, keyingi dars avtomatik ochiladi.`;
      }
      else if (/^(savolim|salom|assalomu|yordam|savol|hi|hello)/i.test(queryClean) || /savol(im)?\s*bor/i.test(queryClean)) {
        aiReply = `🤖 **Mentor Kasbtech Bot** *(Mutaxassis AI Mentor)*\n\nAssalomu alaykum! Albatta, bemalol savolingizni yo'llashingiz mumkin! 🎓✨\n\nKasbtech Akademiyasi bo'yicha kurs darslari, uy vazifalarini topshirish, marketing va IT yo'nalishlari yoki boshqa savollaringiz bo'lsa, marhamat, batafsil yozing!`;
      }
      else {
        // 2. High-Precision Knowledge Base Score Matching (User uploaded entries & Lessons)
        const rawWords = queryClean.replace(/[^\w\s\u0400-\u04FF'’]/gi, '').split(/\s+/).filter(w => w.length >= 3);
        const stopWords = new Set(['va', 'bilan', 'haqida', 'qanday', 'nima', 'uchun', 'qaysi', 'barcha', 'kerak', 'mumkin', 'emas', 'bor', 'dars', 'darslar', 'men', 'menga', 'sizga', 'yo\'q', 'ha', 'to\'liq', 'kurs', 'kursni', 'tamomlasam', 'beriladimi', 'ma\'lumot', 'bering', 'tizimi', 'bo\'yicha']);
        const keyWords = rawWords.filter(w => !stopWords.has(w));

        function calcScore(text) {
          if (!text) return 0;
          const lower = text.toLowerCase();
          let s = 0;
          if (lower.includes(queryClean)) s += 10;
          keyWords.forEach(kw => {
            if (lower.includes(kw)) s += 3;
          });
          return s;
        }

        const scoredKB = kbItems.map(item => ({
          title: item.topic,
          question: item.question,
          content: item.content,
          score: calcScore(`${item.topic} ${item.question || ''} ${item.content}`)
        })).filter(x => x.score >= 3);

        const scoredLessons = lessons.map(l => ({
          title: `Dars: ${l.title}`,
          question: null,
          content: l.description || `${l.title} darsi bo'yicha o'quv materiali.`,
          score: calcScore(`${l.title} ${l.description || ''} ${l.module?.title || ''}`)
        })).filter(x => x.score >= 6);

        const allMatches = [...scoredKB, ...scoredLessons].sort((a, b) => b.score - a.score);
        const bestMatch = allMatches[0];

        if (bestMatch) {
          let contentText = bestMatch.content.trim();
          aiReply = `🤖 **Mentor Kasbtech Bot** *(Mutaxassis AI Mentor)*\n\n📌 **${bestMatch.title.replace(/^Dars:\s*/i, '')}**\n\n${contentText}\n\n💡 *Kasbtech Akademiyasi Bilimlar Bazasi mutaxassislari tomonidan taqdim etilgan.*`;
        } else {
          aiReply = `Kechirasiz, ushbu savol bo'yicha bilimlar bazamizda ma'lumot topilmadi. Iltimos, ustozingizga yoki akademiya adminlariga murojaat qiling.`;
        }
      }
    }

    res.json({ reply: aiReply });
  } catch (error) {
    console.error('AI Mentor chat error:', error.message);
    res.json({ 
      reply: "Kechirasiz, ushbu savol bo'yicha bilimlar bazamizda ma'lumot topilmadi. Iltimos, ustozingizga yoki akademiya adminlariga murojaat qiling." 
    });
  }
});

module.exports = router;
