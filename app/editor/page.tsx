'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useProjectStore } from '@/lib/state/project-store'
import { setupPdfWorker } from '@/lib/pdf/pdfjs-setup'
import { PdfViewer } from '@/components/editor/PdfViewer'
import { LayerSidebar } from '@/components/editor/LayerSidebar'
import { ZoneDrawer } from '@/components/editor/ZoneDrawer'

export default function EditorPage() {
  const router = useRouter()
  const { pdfData, fileName, pageCount, layers } = useProjectStore()
  const [pageIndex, setPageIndex] = useState(0)
  const [isDrawingZone, setIsDrawingZone] = useState(false)

  useEffect(() => { setupPdfWorker() }, [])
  useEffect(() => { if (!pdfData) router.push('/') }, [pdfData, router])

  if (!pdfData) return null

  const visibleOcgRefs = layers
    .filter((l) => l.visible && l.ocgRef)
    .map((l) => l.ocgRef!)

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <div className="h-screen flex flex-col">
        <nav className="flex items-center justify-between px-6 h-14 border-b border-outline-variant bg-surface flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-primary">Counter-Slice</span>
            <span className="text-sm text-on-surface-variant truncate max-w-xs">{fileName}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDrawingZone(!isDrawingZone)}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors
                ${isDrawingZone
                  ? 'bg-primary text-white border-primary'
                  : 'border-outline-variant text-on-surface hover:bg-surface-container-low'}`}
            >
              <span className="material-symbols-outlined text-base">add_box</span>
              {isDrawingZone ? 'Cancel Zone' : 'Add Zone'}
            </button>
            <Link
              href="/report"
              className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-container transition-colors"
            >
              View Report →
            </Link>
          </div>
        </nav>

        <div className="flex-1 grid grid-cols-[1fr_320px] overflow-hidden">
          <div className="relative overflow-hidden bg-surface-dim/20">
            <PdfViewer
              pdfData={pdfData}
              pageIndex={pageIndex}
              visibleOcgRefs={visibleOcgRefs}
            />
            {isDrawingZone && (
              <ZoneDrawer
                pageIndex={pageIndex}
                onZoneComplete={() => setIsDrawingZone(false)}
              />
            )}
          </div>
          <LayerSidebar />
        </div>

        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-4 py-2 border-t border-outline-variant bg-surface flex-shrink-0">
            <button
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
              className="text-sm px-3 py-1 rounded disabled:opacity-40 hover:bg-surface-container-low"
            >
              ← Prev
            </button>
            <span className="text-sm text-on-surface-variant">Page {pageIndex + 1} of {pageCount}</span>
            <button
              onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
              disabled={pageIndex === pageCount - 1}
              className="text-sm px-3 py-1 rounded disabled:opacity-40 hover:bg-surface-container-low"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </>
  )
}
