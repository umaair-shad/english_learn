import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { TeachersModule } from '../teachers/teachers.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (config: ConfigService): JwtModuleOptions => {
        type JwtExpiresIn = NonNullable<
          JwtModuleOptions['signOptions']
        >['expiresIn'];
        return {
          secret: config.getOrThrow<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: (config.get<string>('ACCESS_TOKEN_TTL') ??
              '15m') as JwtExpiresIn,
          },
        };
      },
      inject: [ConfigService],
    }),
    TeachersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule, AuthService],
})
export class AuthModule {}
