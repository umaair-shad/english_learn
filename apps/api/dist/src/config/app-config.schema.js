"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppConfigSchema = AppConfigSchema;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const class_validator_2 = require("class-validator");
class AppConfig {
    DATABASE_URL;
    JWT_SECRET;
    ACCESS_TOKEN_TTL = '15m';
    PORT = 3000;
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AppConfig.prototype, "DATABASE_URL", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(16),
    __metadata("design:type", String)
], AppConfig.prototype, "JWT_SECRET", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AppConfig.prototype, "ACCESS_TOKEN_TTL", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(65535),
    __metadata("design:type", Number)
], AppConfig.prototype, "PORT", void 0);
function AppConfigSchema(config) {
    const validated = (0, class_transformer_1.plainToInstance)(AppConfig, config, {
        enableImplicitConversion: true,
    });
    const errors = (0, class_validator_2.validateSync)(validated, { whitelist: true });
    if (errors.length > 0) {
        throw new Error(`Invalid environment variables: ${errors
            .map((e) => e.toString(true))
            .join('; ')}`);
    }
    return validated;
}
//# sourceMappingURL=app-config.schema.js.map