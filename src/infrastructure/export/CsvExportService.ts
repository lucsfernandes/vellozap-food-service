import { injectable } from 'tsyringe';
import type { CsvColumn, ExportFile, ICsvExportService } from '../../application/ports/IExportService.js';

/** Escapes a CSV field per RFC 4180. */
function escapeCsv(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

@injectable()
export class CsvExportService implements ICsvExportService {
  public toCsv<T>(
    rows: ReadonlyArray<T>,
    columns: ReadonlyArray<CsvColumn<T>>,
    filename: string,
  ): ExportFile {
    const header = columns.map((c) => escapeCsv(c.header)).join(',');
    const body = rows.map((row) => columns.map((c) => escapeCsv(c.value(row))).join(',')).join('\n');
    // BOM so Excel (pt-BR) reads UTF-8 accents correctly.
    const content = Buffer.from(`\uFEFF${header}\n${body}\n`, 'utf8');
    return { filename, contentType: 'text/csv; charset=utf-8', content };
  }
}
