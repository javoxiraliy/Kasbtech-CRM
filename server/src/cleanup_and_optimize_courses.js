const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const prisma = require('./prismaClient');

async function cleanupAndOptimize() {
  console.log('🚀 Starting fast course cleanup and thumbnail optimization...');

  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // 1. Fetch only metadata (no giant base64 thumbnail field!) to make it super fast
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
      createdAt: true,
      _count: { select: { modules: true, enrollments: true } }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Found ${courses.length} total course records.`);

  // 2. Group by normalized title
  const groups = {};
  for (const c of courses) {
    const key = c.title.toLowerCase().replace(/[\s+]+/g, '');
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  }

  const toDeleteIds = [];
  const keepCourses = [];

  for (const [key, list] of Object.entries(groups)) {
    if (list.length > 1) {
      console.log(`Found ${list.length} duplicates for "${list[0].title}"`);
      // Sort to prefer keeping the course with most modules/enrollments
      list.sort((a, b) => (b._count.modules + b._count.enrollments) - (a._count.modules + a._count.enrollments));
      
      const keep = list[0];
      keepCourses.push(keep);
      
      const removeList = list.slice(1);
      for (const rem of removeList) {
        toDeleteIds.push(rem.id);
      }
    } else {
      keepCourses.push(list[0]);
    }
  }

  // Delete duplicates in batch
  if (toDeleteIds.length > 0) {
    console.log(`Deleting ${toDeleteIds.length} duplicate courses:`, toDeleteIds);
    await prisma.course.deleteMany({
      where: { id: { in: toDeleteIds } }
    });
    console.log('✅ Duplicates deleted successfully.');
  }

  // 3. Optimize thumbnail for remaining kept courses
  for (const c of keepCourses) {
    const fullCourse = await prisma.course.findUnique({
      where: { id: c.id },
      select: { id: true, title: true, thumbnail: true }
    });

    if (fullCourse && fullCourse.thumbnail && fullCourse.thumbnail.startsWith('data:image/')) {
      try {
        const matches = fullCourse.thumbnail.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const base64Data = matches[2];
          const filename = `course-thumb-${c.id}.${ext}`;
          const filePath = path.join(uploadsDir, filename);
          
          fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
          const relativePath = `/uploads/${filename}`;
          
          await prisma.course.update({
            where: { id: c.id },
            data: { thumbnail: relativePath }
          });
          console.log(`✅ Optimized thumbnail for course "${c.title}" -> ${relativePath}`);
        }
      } catch (err) {
        console.error(`Failed to optimize thumbnail for course ${c.id}:`, err);
      }
    }
  }

  console.log('🎉 Course cleanup and optimization completed successfully!');
}

cleanupAndOptimize()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
