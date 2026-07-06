declare module 'pdf-parse' {
  interface PdfData {
    text: string
    numpages?: number
    numrender?: number
    info?: Record<string, unknown>
    metadata?: Record<string, unknown>
    version?: string
  }
  function pdfParse(dataBuffer: Buffer, options?: unknown): Promise<PdfData>
  export default pdfParse
}
