const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@crm.uz' },
    update: {},
    create: {
      name: 'Bosh Admin',
      email: 'admin@crm.uz',
      password: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin created:', admin.email);

  // Create operator users
  const op1Password = await bcrypt.hash('operator123', 10);
  const operator1 = await prisma.user.upsert({
    where: { email: 'operator1@crm.uz' },
    update: {},
    create: {
      name: 'Aziz Karimov',
      email: 'operator1@crm.uz',
      password: op1Password,
      role: 'OPERATOR',
    },
  });

  const operator2 = await prisma.user.upsert({
    where: { email: 'operator2@crm.uz' },
    update: {},
    create: {
      name: 'Malika Yusupova',
      email: 'operator2@crm.uz',
      password: op1Password,
      role: 'OPERATOR',
    },
  });
  console.log('✅ Operators created');

  // Create default settings
  const settings = [
    { key: 'sla_time_minutes', value: '15', description: 'Yangi lid uchun SLA vaqti (daqiqalarda)' },
    { key: 'voucher_conditions', value: 'Vaucher tasdiqlash uchun kurs to\'lovining 50% amalga oshirilgan bo\'lishi kerak', description: 'Vaucher tekshiruvi shartlari' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log('✅ Settings created');

  // Create sample leads
  const slaDeadline = new Date(Date.now() + 15 * 60 * 1000);
  const pastDeadline = new Date(Date.now() - 10 * 60 * 1000); // Already breached

  const leads = [
    {
      name: 'Sardor Toshmatov',
      phone: '+998901234567',
      courseInterest: 'SMM',
      employmentStatus: 'unemployed',
      isGrantEligible: true,
      status: 'NEW',
      source: 'instagram',
      slaDeadline: slaDeadline,
      assignedToId: operator1.id,
    },
    {
      name: 'Nodira Rahimova',
      phone: '+998912345678',
      courseInterest: 'VIDEO_EDITING',
      employmentStatus: 'housewife',
      isGrantEligible: true,
      status: 'NEW',
      source: 'telegram',
      slaDeadline: pastDeadline,
      slaBreached: true,
      assignedToId: operator1.id,
    },
    {
      name: 'Jasur Mirzayev',
      phone: '+998923456789',
      courseInterest: 'WEB_DEVELOPMENT',
      employmentStatus: 'student',
      isGrantEligible: false,
      status: 'IN_PROGRESS',
      source: 'manual',
      slaDeadline: null,
      assignedToId: operator2.id,
    },
    {
      name: 'Dilnoza Hasanova',
      phone: '+998934567890',
      courseInterest: 'GRAPHIC_DESIGN',
      employmentStatus: 'employed',
      isGrantEligible: false,
      status: 'VOUCHER_CHECK',
      source: 'facebook',
      slaDeadline: null,
      assignedToId: operator2.id,
    },
    {
      name: 'Bobur Umarov',
      phone: '+998945678901',
      courseInterest: 'PYTHON',
      employmentStatus: 'unemployed',
      isGrantEligible: true,
      status: 'SUCCESS',
      source: 'instagram',
      slaDeadline: null,
      assignedToId: operator1.id,
    },
  ];

  for (const leadData of leads) {
    const lead = await prisma.lead.create({ data: leadData });

    // Add a comment to in-progress leads
    if (['IN_PROGRESS', 'VOUCHER_CHECK', 'SUCCESS'].includes(leadData.status)) {
      await prisma.comment.create({
        data: {
          content: 'Mijoz bilan bog\'lanildi, qiziqish bildirdi.',
          leadId: lead.id,
          authorId: leadData.assignedToId,
        },
      });
    }
  }
  console.log('✅ Sample leads created');

  console.log('\n🎉 Seeding complete!');
  console.log('📋 Login credentials:');
  console.log('   Admin: admin@crm.uz / admin123');
  console.log('   Operator 1: operator1@crm.uz / operator123');
  console.log('   Operator 2: operator2@crm.uz / operator123');
}

main()
  .catch(e => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
