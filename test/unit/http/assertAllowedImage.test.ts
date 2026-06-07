import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertAllowedImage, type UploadedFile } from '../../../src/interfaces/http/upload.js';
import { ValidationError } from '../../../src/domain/errors/index.js';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const WEBP_MAGIC = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x00, 0x00, 0x00, 0x00]),
  Buffer.from('WEBP', 'ascii'),
]);

function file(partial: Partial<UploadedFile>): UploadedFile {
  return {
    buffer: partial.buffer ?? PNG_MAGIC,
    filename: partial.filename ?? 'logo.png',
    contentType: partial.contentType ?? 'image/png',
  };
}

test('accepts a valid PNG / JPEG / WEBP (type + extension + magic agree)', () => {
  assert.doesNotThrow(() => assertAllowedImage(file({})));
  assert.doesNotThrow(() =>
    assertAllowedImage(file({ buffer: JPEG_MAGIC, filename: 'pic.jpg', contentType: 'image/jpeg' })),
  );
  assert.doesNotThrow(() =>
    assertAllowedImage(file({ buffer: JPEG_MAGIC, filename: 'pic.jpeg', contentType: 'image/jpeg; charset=binary' })),
  );
  assert.doesNotThrow(() =>
    assertAllowedImage(file({ buffer: WEBP_MAGIC, filename: 'pic.webp', contentType: 'image/webp' })),
  );
});

test('rejects an SVG (stored-XSS vector) by content-type', () => {
  assert.throws(
    () =>
      assertAllowedImage(
        file({ buffer: Buffer.from('<svg onload=alert(1)>'), filename: 'x.svg', contentType: 'image/svg+xml' }),
      ),
    ValidationError,
  );
});

test('rejects text/html disguised as an image', () => {
  assert.throws(
    () => assertAllowedImage(file({ buffer: Buffer.from('<html>'), filename: 'x.html', contentType: 'text/html' })),
    ValidationError,
  );
});

test('rejects mismatched extension for an allowed content-type', () => {
  assert.throws(
    () => assertAllowedImage(file({ buffer: PNG_MAGIC, filename: 'evil.svg', contentType: 'image/png' })),
    ValidationError,
  );
});

test('rejects spoofed content-type when magic bytes do not match', () => {
  assert.throws(
    () =>
      assertAllowedImage(
        file({ buffer: Buffer.from('<svg/>'), filename: 'evil.png', contentType: 'image/png' }),
      ),
    ValidationError,
  );
});
