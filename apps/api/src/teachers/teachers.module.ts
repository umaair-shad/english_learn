import { Module } from '@nestjs/common';
import { TeachersService } from './teachers.service';

@Module({
  providers: [TeachersService],
  exports: [TeachersService],
})
export class TeachersModule {}
