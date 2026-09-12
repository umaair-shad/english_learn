import ExcelJS from 'exceljs';
import { Injectable } from '@nestjs/common';
import type { ExportFormat } from './exports.dto';

export interface SerializedFile {
  buffer: Buffer;
  contentType: string;
  extension: string;
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str: string;
  if (typeof value === 'string') str = value;
  else if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  )
    str = value.toString();
  else if (value instanceof Date) str = value.toISOString();
  else str = JSON.stringify(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: Array<Record<string, unknown>>): Buffer {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const lines: string[] = [];
  lines.push(headers.map((h) => csvEscape(h)).join(','));
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  // UTF-8 BOM so Excel detects encoding correctly.
  return Buffer.concat([
    Buffer.from('\uFEFF', 'utf8'),
    Buffer.from(lines.join('\r\n'), 'utf8'),
  ]);
}

function toJson(rows: Array<Record<string, unknown>>): Buffer {
  const json = JSON.stringify(
    rows,
    (_key, value: unknown) =>
      typeof value === 'bigint' ? value.toString() : value,
    2,
  );
  return Buffer.from(json, 'utf8');
}

@Injectable()
export class ExportSerializer {
  async serialize(
    format: ExportFormat,
    sheetName: string,
    rows: Array<Record<string, unknown>>,
  ): Promise<SerializedFile> {
    const contentType =
      format === 'csv'
        ? 'text/csv; charset=utf-8'
        : format === 'json'
          ? 'application/json; charset=utf-8'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const buffer =
      format === 'csv'
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

  private async toXlsx(
    sheetName: string,
    rows: Array<Record<string, unknown>>,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
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
}
