export interface StoredFile {
  url: string;
  key: string;
}

export interface UploadInput {
  buffer: Buffer;
  filename: string;
  contentType: string;
  /** Logical prefix, e.g. `logos` or `products`. */
  folder: string;
}

/** Abstraction over object storage (substitutes supabase.storage). */
export interface IStorageProvider {
  upload(input: UploadInput): Promise<StoredFile>;
}
