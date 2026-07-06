import { readFile } from 'node:fs/promises'

export async function extractText(filePath: string, filename: string): Promise<string> {
  const lower = filename.toLowerCase()
  try {
    if (lower.endsWith('.pdf')) return extractPdf(filePath)
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return extractDocx(filePath)
    if (lower.endsWith('.txt') || lower.endsWith('.md')) {
      return await readFile(filePath, 'utf-8')
    }
    return filename
  } catch {
    return filename
  }
}

async function extractPdf(filePath: string): Promise<string> {
  try {
    const pdfParse = (await import('pdf-parse')).default
    const buffer = await readFile(filePath)
    const data = await pdfParse(buffer)
    return data.text ?? ''
  } catch {
    return 'PDF text extraction error'
  }
}

async function extractDocx(filePath: string): Promise<string> {
  try {
    const mammoth = await import('mammoth')
    const buffer = await readFile(filePath)
    const result = await mammoth.extractRawText({ buffer })
    return result.value ?? ''
  } catch {
    return 'DOCX text extraction error'
  }
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'text/plain', 'text/markdown', 'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/mp4',
  'video/mp4', 'video/webm',
  'application/zip', 'application/x-tar', 'application/gzip',
  'application/json', 'application/x-yaml',
  'application/octet-stream',
])

export const MAX_FILE_SIZE = 50 * 1024 * 1024

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType)
}

export function sanitizeFilename(name: string): string {
  name = name.replace(/[^\w.\-() ]/g, '_').trim()
  if (!name) name = 'unnamed'
  return name.slice(0, 255)
}
