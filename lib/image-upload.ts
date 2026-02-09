/**
 * Image upload and processing utilities
 * Validates, compresses, stores, and processes trademark logos
 */

import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

/**
 * Initialize upload directory
 */
export async function initializeUploadDir(): Promise<void> {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

/**
 * Validate image file
 */
export function validateImageFile(
  buffer: Buffer,
  mimeType: string,
  filename: string
): { valid: boolean; error?: string } {
  // Check file size
  if (buffer.length > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { valid: false, error: `MIME type ${mimeType} not allowed` };
  }

  // Check extension
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `File extension .${ext} not allowed` };
  }

  // Check magic bytes (file signatures)
  const png = buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
  const jpeg = buffer.subarray(0, 3).toString('hex') === 'ffd8ff';
  const gif = buffer.subarray(0, 3).toString('ascii') === 'GIF';
  const webp = buffer.subarray(8, 12).toString('ascii') === 'WEBP';

  if (!png && !jpeg && !gif && !webp) {
    return { valid: false, error: 'Invalid image file (magic bytes check failed)' };
  }

  return { valid: true };
}

/**
 * Generate unique filename
 */
export function generateFilename(originalFilename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const ext = originalFilename.split('.').pop();
  return `${timestamp}-${random}.${ext}`;
}

/**
 * Store uploaded image
 */
export async function storeUploadedImage(
  buffer: Buffer,
  mimeType: string,
  originalFilename: string
): Promise<{ filename: string; url: string; error?: string }> {
  try {
    // Validate
    const validation = validateImageFile(buffer, mimeType, originalFilename);
    if (!validation.valid) {
      return { filename: '', url: '', error: validation.error };
    }

    // Initialize directory
    await initializeUploadDir();

    // Generate filename
    const filename = generateFilename(originalFilename);
    const filepath = join(UPLOAD_DIR, filename);

    // Store file
    await writeFile(filepath, buffer);

    // Return URL relative to public folder
    const url = `/uploads/${filename}`;

    return { filename, url };
  } catch (err) {
    return {
      filename: '',
      url: '',
      error: `Failed to store image: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

/**
 * Load stored image
 */
export async function loadStoredImage(filename: string): Promise<Buffer> {
  const filepath = join(UPLOAD_DIR, filename);
  // Security: prevent directory traversal
  if (!filepath.startsWith(UPLOAD_DIR)) {
    throw new Error('Invalid file path');
  }
  return readFile(filepath);
}

/**
 * Delete stored image
 */
export async function deleteStoredImage(filename: string): Promise<void> {
  const { unlink } = await import('fs/promises');
  const filepath = join(UPLOAD_DIR, filename);
  // Security: prevent directory traversal
  if (!filepath.startsWith(UPLOAD_DIR)) {
    throw new Error('Invalid file path');
  }
  try {
    await unlink(filepath);
  } catch (err) {
    // File might not exist, that's ok
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
}

/**
 * Extract filename from URL
 */
export function extractFilenameFromUrl(url: string): string {
  const match = url.match(/\/uploads\/(.+)$/);
  return match ? match[1] : '';
}

/**
 * Parse multipart form data (for API route handlers)
 * Usage in API route:
 *   const formData = await request.formData();
 *   const logoFile = formData.get('logo') as File;
 *   if (logoFile) {
 *     const buffer = Buffer.from(await logoFile.arrayBuffer());
 *     const result = await storeUploadedImage(buffer, logoFile.type, logoFile.name);
 *   }
 */
export interface UploadedFile {
  filename: string;
  buffer: Buffer;
  mimeType: string;
  originalFilename: string;
}
