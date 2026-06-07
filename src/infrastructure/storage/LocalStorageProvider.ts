import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { injectable } from 'tsyringe';
import type { IStorageProvider, StoredFile, UploadInput } from '../../application/ports/IStorageProvider.js';
import { loadEnv } from '../config/env.js';

/** Stores uploads on the local filesystem and serves them via a static route. */
@injectable()
export class LocalStorageProvider implements IStorageProvider {
  private readonly baseDir: string;
  private readonly publicBaseUrl: string;

  public constructor() {
    const env = loadEnv();
    this.baseDir = env.STORAGE_LOCAL_DIR;
    this.publicBaseUrl = env.STORAGE_PUBLIC_BASE_URL.replace(/\/$/, '');
  }

  public async upload(input: UploadInput): Promise<StoredFile> {
    const ext = extname(input.filename) || '';
    const key = `${input.folder}/${randomUUID()}${ext}`;
    const targetPath = join(this.baseDir, key);
    await mkdir(join(this.baseDir, input.folder), { recursive: true });
    await writeFile(targetPath, input.buffer);
    return { key, url: `${this.publicBaseUrl}/${key}` };
  }
}
