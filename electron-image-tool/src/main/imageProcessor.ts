import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';

export interface ImageInfo {
  width: number;
  height: number;
  format: string;
  fileSize: number;
  mode: string;
  filename: string;
  path: string;
}

export interface ImageExportOptions {
  format: 'png' | 'jpeg' | 'webp';
  quality: number;
  width?: number;
  height?: number;
  maintainAspect: boolean;
}

/**
 * Get image metadata using sharp
 */
export async function getImageInfo(buffer: Buffer, filePath: string): Promise<ImageInfo> {
  const metadata = await sharp(buffer).metadata();

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: (metadata.format || 'unknown').toUpperCase(),
    fileSize: buffer.length,
    mode: metadata.channels === 4 ? 'RGBA' : metadata.channels === 3 ? 'RGB' : 'Grayscale',
    filename: path.basename(filePath),
    path: filePath,
  };
}

/**
 * Process and export image using sharp
 * Handles resizing, format conversion, and quality adjustment
 */
export async function processImage(
  buffer: Buffer,
  options: ImageExportOptions
): Promise<Buffer> {
  let pipeline = sharp(buffer);

  // Resize if dimensions specified
  if (options.width || options.height) {
    pipeline = pipeline.resize({
      width: options.width || undefined,
      height: options.height || undefined,
      fit: options.maintainAspect ? 'inside' : 'fill',
      withoutEnlargement: false,
    });
  }

  // Convert format with quality settings
  switch (options.format) {
    case 'jpeg':
      pipeline = pipeline.flatten({ background: '#ffffff' }).jpeg({
        quality: Math.max(1, Math.min(100, options.quality)),
        mozjpeg: true,
      });
      break;

    case 'webp':
      pipeline = pipeline.webp({
        quality: Math.max(1, Math.min(100, options.quality)),
        effort: 4,
      });
      break;

    case 'png':
    default:
      pipeline = pipeline.png({
        compressionLevel: 6,
        effort: 7,
      });
      break;
  }

  return pipeline.toBuffer();
}
