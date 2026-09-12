import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { hash } from 'bcryptjs';
import { AppModule } from '../app.module';
import { TeachersService } from '../teachers/teachers.service';

/**
 * Explicit development-teacher seeder.
 *
 * Usage (required env):
 *   SEED_TEACHER_EMAIL=admin@example.com SEED_TEACHER_PASSWORD='...strong...' \
 *     SEED_TEACHER_DISPLAY_NAME='Adam Teacher' npm run seed:teacher
 *
 * Idempotent: upserts by email. Never runs during normal app bootstrap.
 */
async function main(): Promise<void> {
  const email = (process.env.SEED_TEACHER_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.SEED_TEACHER_PASSWORD ?? '';
  const displayName =
    (process.env.SEED_TEACHER_DISPLAY_NAME ?? '').trim() ||
    email.split('@')[0] ||
    'Teacher';

  if (!email || !password) {
    console.error(
      'Seed requires SEED_TEACHER_EMAIL and SEED_TEACHER_PASSWORD environment variables.',
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Seed password must be at least 8 characters long.');
    process.exit(1);
  }

  const appContext = await NestFactory.createApplicationContext(AppModule);
  try {
    const teachers = appContext.get(TeachersService);
    const existing = await teachers.findByEmail(email);
    const passwordHash = await hash(password, 10);
    const teacher = await teachers.upsertCredentials(
      email,
      passwordHash,
      displayName,
    );
    console.log(
      `Teacher ${existing ? 'updated' : 'created'}: ${teacher.email} (id=${Number(
        teacher.id,
      )}, active=${teacher.is_active})`,
    );
  } finally {
    await appContext.close();
  }
}

void main();
