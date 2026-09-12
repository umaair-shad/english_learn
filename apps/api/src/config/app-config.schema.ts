import { plainToInstance } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { validateSync } from 'class-validator';

class AppConfig {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(16)
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  ACCESS_TOKEN_TTL: string = '15m';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;
}

/**
 * Validates process.env once at boot (used by ConfigModule.forRoot).
 * Returns the typed config object that becomes `ConfigService`.
 */
export function AppConfigSchema(config: Record<string, unknown>): AppConfig {
  const validated = plainToInstance(AppConfig, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { whitelist: true });
  if (errors.length > 0) {
    throw new Error(
      `Invalid environment variables: ${errors
        .map((e) => e.toString(true))
        .join('; ')}`,
    );
  }
  return validated;
}

export type { AppConfig };
