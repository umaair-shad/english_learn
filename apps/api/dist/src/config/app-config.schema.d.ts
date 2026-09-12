declare class AppConfig {
    DATABASE_URL: string;
    JWT_SECRET: string;
    ACCESS_TOKEN_TTL: string;
    PORT: number;
}
export declare function AppConfigSchema(config: Record<string, unknown>): AppConfig;
export type { AppConfig };
