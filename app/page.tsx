'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dropzone } from '@/components/upload/Dropzone'
import { useProjectStore } from '@/lib/state/project-store'
import { setupPdfWorker, pdfjs } from '@/lib/pdf/pdfjs-setup'
import { extractOcgGroups } from '@/lib/pdf/ocg-parser'
import { countObjectsForAllPages } from '@/lib/pdf/object-counter'
import { getLayerColor } from '@/lib/state/project-store'

export default function UploadPage() {
  const router = useRouter()
  const { setFile, setLayers } = useProjectStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setupPdfWorker() }, [])

  const handleFile = useCallback(async (file: File) => {
    setIsProcessing(true)
    setError(null)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise
      const ocgGroups = await extractOcgGroups(pdfDoc)
      const counts = await countObjectsForAllPages(pdfDoc, ocgGroups)

      setFile(file.name, pdfDoc.numPages, arrayBuffer)
      setLayers(
        ocgGroups.map((group, i) => ({
          id: crypto.randomUUID(),
          name: group.name,
          source: 'ocg' as const,
          ocgRef: group.ref,
          count: counts[group.ref] ?? 0,
          visible: group.defaultVisible,
          color: getLayerColor(i),
        }))
      )
      router.push('/editor')
    } catch (err) {
      setError('Failed to process PDF. Please try a valid PDF file.')
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }, [router, setFile, setLayers])

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface border-b border-outline-variant">
        <div className="flex justify-between items-center px-8 h-16 max-w-[1440px] mx-auto">
          <span className="text-xl font-bold text-primary">Counter-Slice</span>
        </div>
      </nav>
      <main className="pt-16 min-h-screen flex flex-col items-center justify-center px-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-on-surface mb-4 max-w-2xl mx-auto">
            Count your PDF <span className="text-primary">layers precisely</span>.
          </h1>
          <p className="text-lg text-on-surface-variant max-w-xl mx-auto">
            Upload a PDF to extract OCG layers, count objects, and export structured reports.
          </p>
        </div>
        <Dropzone onFile={handleFile} isProcessing={isProcessing} />
        {error && <p className="mt-4 text-sm text-error">{error}</p>}
      </main>
    </>
  )
}
