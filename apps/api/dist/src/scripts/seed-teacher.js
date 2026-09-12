"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const bcryptjs_1 = require("bcryptjs");
const app_module_1 = require("../app.module");
const teachers_service_1 = require("../teachers/teachers.service");
async function main() {
    const email = (process.env.SEED_TEACHER_EMAIL ?? '').trim().toLowerCase();
    const password = process.env.SEED_TEACHER_PASSWORD ?? '';
    const displayName = (process.env.SEED_TEACHER_DISPLAY_NAME ?? '').trim() ||
        email.split('@')[0] ||
        'Teacher';
    if (!email || !password) {
        console.error('Seed requires SEED_TEACHER_EMAIL and SEED_TEACHER_PASSWORD environment variables.');
        process.exit(1);
    }
    if (password.length < 8) {
        console.error('Seed password must be at least 8 characters long.');
        process.exit(1);
    }
    const appContext = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    try {
        const teachers = appContext.get(teachers_service_1.TeachersService);
        const existing = await teachers.findByEmail(email);
        const passwordHash = await (0, bcryptjs_1.hash)(password, 10);
        const teacher = await teachers.upsertCredentials(email, passwordHash, displayName);
        console.log(`Teacher ${existing ? 'updated' : 'created'}: ${teacher.email} (id=${Number(teacher.id)}, active=${teacher.is_active})`);
    }
    finally {
        await appContext.close();
    }
}
void main();
//# sourceMappingURL=seed-teacher.js.map