import { injectable } from 'tsyringe';
import type { ExportFile, IPdfExportService } from '../../application/ports/IExportService.js';

/** Escapes text for a PDF literal string. */
function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Minimal single-page text PDF generator (no external deps). Produces a valid
 * PDF with the title and rows printed line by line. Sufficient for the v1
 * order export; can be swapped for a richer generator later.
 */
@injectable()
export class PdfExportService implements IPdfExportService {
  public toPdf(
    title: string,
    headers: ReadonlyArray<string>,
    rows: ReadonlyArray<ReadonlyArray<string>>,
    filename: string,
  ): ExportFile {
    const lines: string[] = [title, '', headers.join('  |  ')];
    for (const row of rows) {
      lines.push(row.join('  |  '));
    }

    const textContent = lines
      .map((line, idx) => {
        const y = 800 - idx * 16;
        return `BT /F1 11 Tf 40 ${y} Td (${escapePdfText(line)}) Tj ET`;
      })
      .join('\n');

    const stream = `${textContent}\n`;
    const objects: string[] = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
      `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}endstream`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];
    objects.forEach((obj, i) => {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    });
    const xrefStart = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) {
      pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    return { filename, contentType: 'application/pdf', content: Buffer.from(pdf, 'utf8') };
  }
}
