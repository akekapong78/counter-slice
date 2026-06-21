'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { pdfjs } from '@/lib/pdf/pdfjs-setup'
import type { PDFDocumentProxy } from 'pdfjs-dist'

type Props = {
  pdfData: ArrayBuffer
  pageIndex: number
  visibleOcgRefs: string[]
}

export type PdfViewerHandle = {
  getCanvas: () => HTMLCanvasElement | null
}

export const PdfViewer = forwardRef<PdfViewerHandle, Props>(function PdfViewer(
  { pdfData, pageIndex, visibleOcgRefs },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)

  useImperativeHandle(ref, () => ({ getCanvas: () => canvasRef.current }))

  useEffect(() => {
    let cancelled = false
    pdfjs.getDocument({ data: pdfData.slice(0) }).promise.then((doc) => {
      if (!cancelled) setPdfDoc(doc)
    })
    return () => { cancelled = true }
  }, [pdfData])

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return
    let cancelled = false

    const renderPage = async () => {
      const page = await pdfDoc.getPage(pageIndex + 1)
      if (cancelled) return

      const ocConfig = await pdfDoc.getOptionalContentConfig()
      const allGroups = ocConfig.getGroups()
      if (allGroups) {
        for (const ref of Object.keys(allGroups)) {
          ocConfig.setVisibility(ref, visibleOcgRefs.includes(ref))
        }
      }

      const viewport = page.getViewport({ scale: 1.2 })
      const canvas = canvasRef.current!
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!

      await page.render({
        canvasContext: ctx,
        viewport,
        optionalContentConfigPromise: Promise.resolve(ocConfig),
      }).promise
    }

    renderPage()
    return () => { cancelled = true }
  }, [pdfDoc, pageIndex, visibleOcgRefs])

  return (
    <div className="w-full h-full overflow-auto flex justify-center items-start p-4">
      <canvas ref={canvasRef} className="shadow-xl rounded-sm max-w-full" />
    </div>
  )
})
