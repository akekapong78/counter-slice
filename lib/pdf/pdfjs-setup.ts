import * as pdfjs from 'pdfjs-dist'

export function setupPdfWorker(): void {
  if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
  }
}

export { pdfjs }
