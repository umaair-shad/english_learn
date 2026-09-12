import type { ExportFormat } from './exports.dto';
export interface SerializedFile {
    buffer: Buffer;
    contentType: string;
    extension: string;
}
export declare class ExportSerializer {
    serialize(format: ExportFormat, sheetName: string, rows: Array<Record<string, unknown>>): Promise<SerializedFile>;
    private toXlsx;
}
