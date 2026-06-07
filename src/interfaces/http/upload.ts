import type { Request } from 'express';
import { ValidationError } from '../../domain/errors/index.js';

export interface UploadedFile {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

/** Allowed raster image types for logo/product uploads (M1, anti stored-XSS). */
const ALLOWED_IMAGE_TYPES: ReadonlyArray<{
  contentType: string;
  extensions: ReadonlyArray<string>;
  /** Predicate over the file's leading bytes (magic number sniffing). */
  matchesMagic: (b: Buffer) => boolean;
}> = [
  {
    contentType: 'image/png',
    extensions: ['.png'],
    // 89 50 4E 47 0D 0A 1A 0A
    matchesMagic: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    contentType: 'image/jpeg',
    extensions: ['.jpg', '.jpeg'],
    // FF D8 FF
    matchesMagic: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    contentType: 'image/webp',
    extensions: ['.webp'],
    // "RIFF" .... "WEBP"
    matchesMagic: (b) =>
      b.length >= 12 &&
      b.subarray(0, 4).toString('ascii') === 'RIFF' &&
      b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
];

const ALLOWED_EXTENSIONS = ALLOWED_IMAGE_TYPES.flatMap((t) => t.extensions);
const ALLOWED_CONTENT_TYPES = ALLOWED_IMAGE_TYPES.map((t) => t.contentType);

/**
 * Validates an uploaded file against the image allowlist (M1): the declared
 * content-type, the filename extension, AND the leading magic bytes must all
 * agree on a permitted raster image type. Rejects SVG/HTML/etc. with a 422.
 */
export function assertAllowedImage(file: UploadedFile): void {
  const ct = file.contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  const ext = (/\.[a-z0-9]+$/i.exec(file.filename.toLowerCase())?.[0] ?? '').toLowerCase();

  const byType = ALLOWED_IMAGE_TYPES.find((t) => t.contentType === ct);
  if (!byType) {
    throw new ValidationError('Unsupported image type', {
      allowedContentTypes: ALLOWED_CONTENT_TYPES,
    });
  }
  if (!byType.extensions.includes(ext)) {
    throw new ValidationError('Image extension does not match its content type', {
      allowedExtensions: ALLOWED_EXTENSIONS,
    });
  }
  if (!byType.matchesMagic(file.buffer)) {
    throw new ValidationError('File content does not match the declared image type');
  }
}

/** Collects the raw request body into a Buffer. */
function readRawBody(req: Request): Promise<Buffer> {
  // If body-parsing middleware already captured rawBody, reuse it.
  if (req.rawBody && req.rawBody.length > 0) {
    return Promise.resolve(req.rawBody);
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * Minimal multipart/form-data single-file parser (no external deps). Parses the
 * first file part. Sufficient for logo/product image uploads.
 */
export async function uploadSingleFile(req: Request): Promise<UploadedFile | null> {
  const contentType = req.headers['content-type'] ?? '';
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  if (!match) {
    return null;
  }
  const boundary = `--${match[1] ?? match[2]}`;
  const body = await readRawBody(req);

  const parts = splitBuffer(body, Buffer.from(boundary));
  for (const part of parts) {
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
      continue;
    }
    const headerText = part.subarray(0, headerEnd).toString('utf8');
    if (!/filename="?([^"\r\n]*)"?/i.test(headerText)) {
      continue;
    }
    const filenameMatch = /filename="?([^"\r\n]*)"?/i.exec(headerText);
    const ctMatch = /content-type:\s*([^\r\n]+)/i.exec(headerText);
    let content = part.subarray(headerEnd + 4);
    // Trim trailing CRLF before the next boundary.
    if (content.subarray(content.length - 2).toString() === '\r\n') {
      content = content.subarray(0, content.length - 2);
    }
    const filename = filenameMatch?.[1] ?? 'upload.bin';
    if (!filename) {
      continue;
    }
    return {
      buffer: content,
      filename,
      contentType: ctMatch?.[1]?.trim() ?? 'application/octet-stream',
    };
  }
  return null;
}

function splitBuffer(buffer: Buffer, delimiter: Buffer): Buffer[] {
  const result: Buffer[] = [];
  let start = 0;
  let index = buffer.indexOf(delimiter, start);
  while (index !== -1) {
    if (index > start) {
      result.push(buffer.subarray(start, index));
    }
    start = index + delimiter.length;
    index = buffer.indexOf(delimiter, start);
  }
  return result;
}
