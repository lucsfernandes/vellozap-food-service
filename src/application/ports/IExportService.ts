export interface ExportFile {
  filename: string;
  contentType: string;
  content: Buffer;
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

export interface ICsvExportService {
  toCsv<T>(rows: ReadonlyArray<T>, columns: ReadonlyArray<CsvColumn<T>>, filename: string): ExportFile;
}

export interface IPdfExportService {
  /** Minimal tabular PDF export (text-based). */
  toPdf(title: string, headers: ReadonlyArray<string>, rows: ReadonlyArray<ReadonlyArray<string>>, filename: string): ExportFile;
}
