import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AccessTokenOptionsDto,
  CreateStudentDto,
  StudentQueryDto,
  UpdateStudentDto,
} from './dto/students.dto';
import { StudentsService } from './students.service';

@ApiTags('students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  list(@Query() query: StudentQueryDto) {
    return this.students.list(query);
  }

  @Post()
  create(@Body() body: CreateStudentDto) {
    return this.students.create(body);
  }

  @Get(':id')
  get(@Param('id', new ParseIntPipe()) id: number) {
    return this.students.getById(id);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() body: UpdateStudentDto,
  ) {
    return this.students.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', new ParseIntPipe()) id: number) {
    await this.students.softDelete(id);
    return { id, deactivated: true };
  }

  @Post(':id/access-token')
  createToken(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() body: AccessTokenOptionsDto,
  ) {
    return this.students.createAccessToken(id, body);
  }

  @Post(':id/access-token/regenerate')
  @HttpCode(HttpStatus.CREATED)
  regenerateToken(
    @Param('id', new ParseIntPipe()) id: number,
    @Body() body: AccessTokenOptionsDto,
  ) {
    return this.students.createAccessToken(id, body);
  }

  @Post(':id/access-token/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeToken(@Param('id', new ParseIntPipe()) id: number) {
    await this.students.revokeAccessToken(id);
    return { id, revoked: true };
  }
}
