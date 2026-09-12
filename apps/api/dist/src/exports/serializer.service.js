"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportSerializer = void 0;
const exceljs_1 = __importDefault(require("exceljs"));
const common_1 = require("@nestjs/common");
function csvEscape(value) {
    if (value === null || value === undefined)
        return '';
    let str;
    if (typeof value === 'string')
        str = value;
    else if (typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint')
        str = value.toString();
    else if (value instanceof Date)
        str = value.toISOString();
    else
        str = JSON.stringify(value);
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}
function toCsv(rows) {
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    const lines = [];
    lines.push(headers.map((h) => csvEscape(h)).join(','));
    for (const row of rows) {
        lines.push(headers.map((h) => csvEscape(row[h])).join(','));
    }
    return Buffer.concat([
        Buffer.from('\uFEFF', 'utf8'),
        Buffer.from(lines.join('\r\n'), 'utf8'),
    ]);
}
function toJson(rows) {
    const json = JSON.stringify(rows, (_key, value) => typeof value === 'bigint' ? value.toString() : value, 2);
    return Buffer.from(json, 'utf8');
}
let ExportSerializer = class ExportSerializer {
    async serialize(format, sheetName, rows) {
        const contentType = format === 'csv'
            ? 'text/csv; charset=utf-8'
            : format === 'json'
                ? 'application/json; charset=utf-8'
                : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const buffer = format === 'csv'
            ? toCsv(rows)
            : format === 'json'
                ? toJson(rows)
                : await this.toXlsx(sheetName, rows);
        return {
            buffer,
            contentType,
            extension: format,
        };
    }
    async toXlsx(sheetName, rows) {
        const workbook = new exceljs_1.default.Workbook();
        workbook.created = new Date();
        const sheet = workbook.addWorksheet(sheetName.replace(/[\\/*?:[\]]/g, '_'));
        const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
        sheet.columns = headers.map((h) => ({ header: h, key: h, width: 22 }));
        for (const row of rows) {
            sheet.addRow(row);
        }
        if (headers.length > 0) {
            sheet.autoFilter = {
                from: { row: 1, column: 1 },
                to: { row: 1, column: headers.length },
            };
        }
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
};
exports.ExportSerializer = ExportSerializer;
exports.ExportSerializer = ExportSerializer = __decorate([
    (0, common_1.Injectable)()
], ExportSerializer);
//# sourceMappingURL=serializer.service.js.map