import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.attendance.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.groupStudent.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  // ===== ADMIN =====
  const admin = await prisma.user.create({
    data: {
      login: 'admin',
      password: hash('admin123'),
      name: 'Admin',
      role: 'admin',
      phone: '+998 94 804 06 26',
    },
  });

  // ===== O'QITUVCHILAR =====
  const shahboz = await prisma.user.create({
    data: {
      login: 'shahboz',
      password: hash('teacher123'),
      name: 'Boliboyev Shahboz',
      role: 'teacher',
      phone: '+998 90 111 22 33',
      subject: 'Matematika',
    },
  });

  const javohir = await prisma.user.create({
    data: {
      login: 'javohir',
      password: hash('teacher123'),
      name: 'Bratov Javohir',
      role: 'teacher',
      phone: '+998 91 222 33 44',
      subject: 'Ingliz tili',
    },
  });

  const rahmonjon = await prisma.user.create({
    data: {
      login: 'rahmonjon',
      password: hash('teacher123'),
      name: 'Vafoxonov Rahmonjon',
      role: 'teacher',
      phone: '+998 93 333 44 55',
      subject: 'Ona tili va adabiyot',
    },
  });

  const sunnatilla = await prisma.user.create({
    data: {
      login: 'sunnatilla',
      password: hash('teacher123'),
      name: 'Sunnatilla Mardiyev',
      role: 'teacher',
      phone: '+998 94 444 55 66',
      subject: 'Biologiya va Kimyo',
    },
  });

  const shomansur = await prisma.user.create({
    data: {
      login: 'shomansur',
      password: hash('teacher123'),
      name: 'Tirkashev Shomansur',
      role: 'teacher',
      phone: '+998 95 555 66 77',
      subject: 'Fizika',
    },
  });

  const muxlisjon = await prisma.user.create({
    data: {
      login: 'muxlisjon',
      password: hash('teacher123'),
      name: 'Berdanov Muxlisjon',
      role: 'teacher',
      phone: '+998 97 666 77 88',
      subject: 'Tarix',
    },
  });

  // ===== O'QUVCHILAR =====
  const zoir = await prisma.user.create({
    data: {
      login: 'zoir',
      password: hash('student123'),
      name: 'Rahmatov Zoir',
      role: 'student',
      phone: '+998 94 111 00 11',
    },
  });

  const islom = await prisma.user.create({
    data: {
      login: 'islom',
      password: hash('student123'),
      name: 'Sheraliyev Islom',
      role: 'student',
      phone: '+998 95 222 00 22',
    },
  });

  const setora = await prisma.user.create({
    data: {
      login: 'setora',
      password: hash('student123'),
      name: 'Ochilova Setora',
      role: 'student',
      phone: '+998 90 333 00 33',
    },
  });

  const muhammadali = await prisma.user.create({
    data: {
      login: 'muhammadali',
      password: hash('student123'),
      name: 'Saydullayev Muhammadali',
      role: 'student',
      phone: '+998 91 444 00 44',
    },
  });

  const aziza = await prisma.user.create({
    data: {
      login: 'aziza',
      password: hash('student123'),
      name: 'Dustqobilova Aziza',
      role: 'student',
      phone: '+998 93 555 00 55',
    },
  });

  const farangiz = await prisma.user.create({
    data: {
      login: 'farangiz',
      password: hash('student123'),
      name: 'Rashidova Farangiz',
      role: 'student',
      phone: '+998 97 666 00 66',
    },
  });

  // ===== GURUHLAR =====
  const mathGroup = await prisma.group.create({
    data: {
      name: 'Matematika 1-guruh',
      subject: 'Matematika',
      teacherId: shahboz.id,
      schedule: 'Dush/Chor/Jum 10:00',
      meetLink: 'https://meet.google.com/mat-guruh-001',
    },
  });

  const engGroup = await prisma.group.create({
    data: {
      name: 'Ingliz tili 1-guruh',
      subject: 'Ingliz tili',
      teacherId: javohir.id,
      schedule: 'Dush/Chor/Jum 14:00',
      meetLink: 'https://meet.google.com/eng-guruh-001',
    },
  });

  const uzGroup = await prisma.group.create({
    data: {
      name: 'Ona tili 1-guruh',
      subject: 'Ona tili va adabiyot',
      teacherId: rahmonjon.id,
      schedule: 'Sesh/Pay/Shan 09:00',
      meetLink: 'https://meet.google.com/ozt-guruh-001',
    },
  });

  const chemGroup = await prisma.group.create({
    data: {
      name: 'Kimyo 1-guruh',
      subject: 'Kimyo',
      teacherId: sunnatilla.id,
      schedule: 'Sesh/Pay/Shan 16:00',
      meetLink: 'https://meet.google.com/kim-guruh-001',
    },
  });

  const physGroup = await prisma.group.create({
    data: {
      name: 'Fizika 1-guruh',
      subject: 'Fizika',
      teacherId: shomansur.id,
      schedule: 'Dush/Chor/Jum 16:00',
      meetLink: 'https://meet.google.com/fiz-guruh-001',
    },
  });

  const histGroup = await prisma.group.create({
    data: {
      name: 'Tarix 1-guruh',
      subject: 'Tarix',
      teacherId: muxlisjon.id,
      schedule: 'Sesh/Pay/Shan 11:00',
      meetLink: 'https://meet.google.com/tar-guruh-001',
    },
  });

  const bioGroup = await prisma.group.create({
    data: {
      name: 'Biologiya 1-guruh',
      subject: 'Biologiya',
      teacherId: sunnatilla.id,
      schedule: 'Dush/Chor/Jum 12:00',
      meetLink: 'https://meet.google.com/bio-guruh-001',
    },
  });

  // ===== O'QUVCHILARNI GURUHLARGA QO'SHISH =====
  // Zoir -> Matematika, Fizika
  await prisma.groupStudent.createMany({
    data: [
      { groupId: mathGroup.id, studentId: zoir.id },
      { groupId: physGroup.id, studentId: zoir.id },
    ],
  });

  // Islom -> Kimyo, Biologiya
  await prisma.groupStudent.createMany({
    data: [
      { groupId: chemGroup.id, studentId: islom.id },
      { groupId: bioGroup.id, studentId: islom.id },
    ],
  });

  // Setora -> Ona tili, Tarix
  await prisma.groupStudent.createMany({
    data: [
      { groupId: uzGroup.id, studentId: setora.id },
      { groupId: histGroup.id, studentId: setora.id },
    ],
  });

  // Muhammadali -> Matematika
  await prisma.groupStudent.createMany({
    data: [
      { groupId: mathGroup.id, studentId: muhammadali.id },
    ],
  });

  // Aziza -> Kimyo, Ingliz tili
  await prisma.groupStudent.createMany({
    data: [
      { groupId: chemGroup.id, studentId: aziza.id },
      { groupId: engGroup.id, studentId: aziza.id },
    ],
  });

  // Farangiz -> Ona tili, Ingliz tili
  await prisma.groupStudent.createMany({
    data: [
      { groupId: uzGroup.id, studentId: farangiz.id },
      { groupId: engGroup.id, studentId: farangiz.id },
    ],
  });

  // ===== DARSLAR =====
  // Matematika darslari
  const mathLessons = await prisma.lesson.createMany({
    data: [
      { groupId: mathGroup.id, topic: 'Sonlar va amallar', scheduledDate: '2026-07-14', scheduledTime: '10:00', duration: '1.5 soat', order: 1 },
      { groupId: mathGroup.id, topic: 'Algebraik ifodalar', scheduledDate: '2026-07-16', scheduledTime: '10:00', duration: '1.5 soat', order: 2 },
      { groupId: mathGroup.id, topic: 'Tenglamalar', scheduledDate: '2026-07-18', scheduledTime: '10:00', duration: '1.5 soat', order: 3 },
      { groupId: mathGroup.id, topic: null, scheduledDate: '2026-07-21', scheduledTime: '10:00', duration: '1.5 soat', order: 4 },
      { groupId: mathGroup.id, topic: null, scheduledDate: '2026-07-23', scheduledTime: '10:00', duration: '2 soat', order: 5 },
      { groupId: mathGroup.id, topic: null, scheduledDate: '2026-07-25', scheduledTime: '10:00', duration: '1.5 soat', order: 6 },
    ],
  });

  // Ingliz tili darslari
  await prisma.lesson.createMany({
    data: [
      { groupId: engGroup.id, topic: 'Grammar: Present tenses', scheduledDate: '2026-07-14', scheduledTime: '14:00', duration: '1.5 soat', order: 1 },
      { groupId: engGroup.id, topic: 'Grammar: Past tenses', scheduledDate: '2026-07-16', scheduledTime: '14:00', duration: '1.5 soat', order: 2 },
      { groupId: engGroup.id, topic: 'Reading skills', scheduledDate: '2026-07-18', scheduledTime: '14:00', duration: '1.5 soat', order: 3 },
      { groupId: engGroup.id, topic: null, scheduledDate: '2026-07-21', scheduledTime: '14:00', duration: '1.5 soat', order: 4 },
      { groupId: engGroup.id, topic: null, scheduledDate: '2026-07-23', scheduledTime: '14:00', duration: '1 soat', order: 5 },
    ],
  });

  // Ona tili darslari
  await prisma.lesson.createMany({
    data: [
      { groupId: uzGroup.id, topic: 'Fonetika va orfografiya', scheduledDate: '2026-07-15', scheduledTime: '09:00', duration: '1.5 soat', order: 1 },
      { groupId: uzGroup.id, topic: 'Morfologiya', scheduledDate: '2026-07-17', scheduledTime: '09:00', duration: '1.5 soat', order: 2 },
      { groupId: uzGroup.id, topic: null, scheduledDate: '2026-07-19', scheduledTime: '09:00', duration: '1.5 soat', order: 3 },
      { groupId: uzGroup.id, topic: null, scheduledDate: '2026-07-22', scheduledTime: '09:00', duration: '1.5 soat', order: 4 },
    ],
  });

  // Kimyo darslari
  await prisma.lesson.createMany({
    data: [
      { groupId: chemGroup.id, topic: 'Atom tuzilishi', scheduledDate: '2026-07-15', scheduledTime: '16:00', duration: '1.5 soat', order: 1 },
      { groupId: chemGroup.id, topic: 'Kimyoviy bog\'lanish', scheduledDate: '2026-07-17', scheduledTime: '16:00', duration: '1.5 soat', order: 2 },
      { groupId: chemGroup.id, topic: null, scheduledDate: '2026-07-19', scheduledTime: '16:00', duration: '1.5 soat', order: 3 },
    ],
  });

  // Fizika darslari
  await prisma.lesson.createMany({
    data: [
      { groupId: physGroup.id, topic: 'Mexanika: Kinematika', scheduledDate: '2026-07-14', scheduledTime: '16:00', duration: '1.5 soat', order: 1 },
      { groupId: physGroup.id, topic: 'Mexanika: Dinamika', scheduledDate: '2026-07-16', scheduledTime: '16:00', duration: '1.5 soat', order: 2 },
      { groupId: physGroup.id, topic: 'Energiya va ish', scheduledDate: '2026-07-18', scheduledTime: '16:00', duration: '2 soat', order: 3 },
      { groupId: physGroup.id, topic: null, scheduledDate: '2026-07-21', scheduledTime: '16:00', duration: '1.5 soat', order: 4 },
    ],
  });

  // Tarix darslari
  await prisma.lesson.createMany({
    data: [
      { groupId: histGroup.id, topic: 'Qadimgi O\'zbekiston', scheduledDate: '2026-07-15', scheduledTime: '11:00', duration: '1.5 soat', order: 1 },
      { groupId: histGroup.id, topic: 'Amir Temur davri', scheduledDate: '2026-07-17', scheduledTime: '11:00', duration: '1.5 soat', order: 2 },
      { groupId: histGroup.id, topic: null, scheduledDate: '2026-07-19', scheduledTime: '11:00', duration: '1.5 soat', order: 3 },
    ],
  });

  // Biologiya darslari
  await prisma.lesson.createMany({
    data: [
      { groupId: bioGroup.id, topic: 'Hujayra tuzilishi', scheduledDate: '2026-07-14', scheduledTime: '12:00', duration: '1.5 soat', order: 1 },
      { groupId: bioGroup.id, topic: 'Genetika asoslari', scheduledDate: '2026-07-16', scheduledTime: '12:00', duration: '1.5 soat', order: 2 },
      { groupId: bioGroup.id, topic: null, scheduledDate: '2026-07-18', scheduledTime: '12:00', duration: '1.5 soat', order: 3 },
    ],
  });

  // ===== O'TGAN DARSLAR UCHUN DAVOMAT =====
  const pastMathLessons = await prisma.lesson.findMany({
    where: { groupId: mathGroup.id, scheduledDate: { lt: '2026-07-18' } },
  });

  for (const lesson of pastMathLessons) {
    await prisma.attendance.createMany({
      data: [
        { lessonId: lesson.id, studentId: zoir.id, present: true },
        { lessonId: lesson.id, studentId: muhammadali.id, present: lesson.order === 1 },
      ],
    });
  }

  console.log('Seed completed! Demo login ma\'lumotlari:');
  console.log('  Admin:     login: admin      parol: admin123');
  console.log('  O\'qituvchi: login: shahboz    parol: teacher123');
  console.log('  O\'quvchi:  login: zoir       parol: student123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
