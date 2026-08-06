const express = require('express');
const router = express.Router();
const prisma = require('../prismaClient');
const { authenticate, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// POST /api/lms/ai-mentor/chat - AI Mentor chat endpoint with strict knowledge-base RAG & smart fallback
router.post('/ai-mentor/chat', authenticate, async (req, res) => {
  try {
    const { message, courseId } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Savol matni kiritilishi shart' });
    }

    // Fetch Knowledge Base entries
    const where = {};
    if (courseId) {
      where.OR = [{ courseId: courseId }, { courseId: null }];
    }
    const kbItems = await prisma.botKnowledge.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // Build context text from Knowledge Base
    let contextText = '';
    if (kbItems.length === 0) {
      contextText = 'Hozircha ma\'lumotlar bazasida hech qanday bilim kiritilmagan.';
    } else {
      contextText = kbItems.map((item, idx) => 
        `[Bilim ${idx + 1}] Mavzu: ${item.topic}\nSavol/Kalit so'z: ${item.question || 'Mavjud emas'}\nKontent/Javob: ${item.content}`
      ).join('\n\n');
    }

    // System instruction prompt forcing strict compliance with Knowledge Base
    const systemPrompt = `Siz "Mentor Kasbtech Bot" – Kasbtech Akademiyasining talabalar uchun yordamchi AI mentorisiz.
SIZ QUYIDAGI QAT'IY QOIDALARGA AMAL QILISHINGIZ SHART:
1. Faqat va faqat quyida "=== KASBTECH BILIMLAR BAZASI ===" sarlavhasi ostida keltirilgan ma'lumotlar va bilimlar asosida javob bering.
2. Agar talabaning savoliga tegishli javob yoki ma'lumot ushbu Bilimlar bazasida MAVJUD BO'LMASA, HECH QACHON o'zingizdan tashqi ma'lumot, taxmin yoki o'ylab topilgan javob bermang!
3. Bilimlar bazasida javob topilmagan taqdirda, ANQ ushbu ko'rinishda javob bering: "Kechirasiz, ushbu savol bo'yicha bilimlar bazamizda ma'lumot topilmadi. Iltimos, ustozingizga yoki akademiya adminlariga murojaat qiling."
4. Javobingizni o'zbek tilida, muloyim, aniq va chiroyli formatlangan ko'rinishda bering.

=== KASBTECH BILIMLAR BAZASI ===
${contextText}
=================================`;

    // Retrieve Gemini API Key from database settings or process.env
    const settingKey = await prisma.setting.findUnique({ where: { key: 'GEMINI_API_KEY' } });
    const apiKey = settingKey?.value || process.env.GEMINI_API_KEY || 'AQ.Ab8RN6ILdcxXSBbHka0A2UJngGn65ULC42_OgiRDDUS-xvocqA';

    const fullPrompt = `${systemPrompt}\n\nFoydalanuvchi savoli: ${message}`;
    const contents = [{ role: 'user', parts: [{ text: fullPrompt }] }];

    let aiReply = '';
    const axios = require('axios');

    // Attempt calling Gemini models
    const candidateModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    for (const modelName of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const response = await axios.post(geminiUrl, { contents }, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          aiReply = text;
          break;
        }
      } catch (err) {
        console.warn(`Gemini model ${modelName} API error:`, err.response?.data?.error?.message || err.message);
      }
    }

    // Fallback: If Gemini API fails (quota / network / invalid key), use direct Knowledge Base matching engine
    if (!aiReply) {
      console.log('Gemini API unavailable or quota exceeded, using smart Knowledge Base matching...');
      
      const userWords = message.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      let matchedItem = null;
      let maxScore = 0;

      for (const item of kbItems) {
        const itemText = `${item.topic} ${item.question || ''} ${item.content}`.toLowerCase();
        let score = 0;
        userWords.forEach(word => {
          if (itemText.includes(word)) score++;
        });

        if (score > maxScore) {
          maxScore = score;
          matchedItem = item;
        }
      }

      if (matchedItem && maxScore > 0) {
        aiReply = `📌 **${matchedItem.topic}**\n\n${matchedItem.content}`;
      } else {
        aiReply = "Kechirasiz, ushbu savol bo'yicha bilimlar bazamizda ma'lumot topilmadi. Iltimos, ustozingizga yoki akademiya adminlariga murojaat qiling.";
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
