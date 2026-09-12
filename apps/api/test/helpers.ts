import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { hash } from 'bcryptjs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

export const TEST_TEACHER = {
  email: 'e2e-teacher@example.com',
  password: 'E2e-Teacher-Pass-2026',
  displayName: 'E2E Teacher',
};

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  await app.init();
  return app;
}

export async function seedTeacher(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  const passwordHash = await hash(TEST_TEACHER.password, 10);
  await prisma.teacher_accounts.upsert({
    where: { email: TEST_TEACHER.email },
    update: {
      password_hash: passwordHash,
      display_name: TEST_TEACHER.displayName,
      is_active: true,
    },
    create: {
      email: TEST_TEACHER.email,
      password_hash: passwordHash,
      display_name: TEST_TEACHER.displayName,
    },
  });
}

export async function removeTestTeacher(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.teacher_accounts.deleteMany({
    where: { email: TEST_TEACHER.email },
  });
}

export async function removeStudentsWithPrefix(
  app: INestApplication,
  prefix: string,
): Promise<void> {
  const prisma = app.get(PrismaService);
  const rows = await prisma.students.findMany({
    where: { display_name: { startsWith: prefix } },
    select: { id: true },
  });
  if (rows.length > 0) {
    await prisma.students.deleteMany({
      where: { id: { in: rows.map((r) => r.id) } },
    });
  }
}
