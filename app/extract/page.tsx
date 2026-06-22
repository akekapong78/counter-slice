'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useProjectStore } from '@/lib/state/project-store'
import { setupPdfWorker } from '@/lib/pdf/pdfjs-setup'
import { ExtractViewer } from '@/components/extract/ExtractViewer'
import { ColorMappingPanel } from '@/components/extract/ColorMappingPanel'
import { EquipmentNamesTable } from '@/components/extract/EquipmentNamesTable'
import { ResultsPanel } from '@/components/extract/ResultsPanel'

export default function ExtractPage() {
  const router = useRouter()
  const { pdfData, fileName, pageCount, extractBlocks, setExtractItemCounts, loadCatalog } = useProjectStore()
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)

  useEffect(() => { setupPdfWorker() }, [])
  useEffect(() => { void loadCatalog() }, [loadCatalog])
  useEffect(() => { if (!pdfData) router.push('/') }, [pdfData, router])

  if (!pdfData) return null

  function handleSelectBlock(id: string, blockPageIndex: number) {
    setSelectedBlockId(id)
    if (blockPageIndex !== pageIndex) setPageIndex(blockPageIndex)
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <div className="h-screen flex flex-col">
        {/* Nav */}
        <nav className="flex items-center justify-between px-6 h-14 border-b border-outline-variant bg-surface flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-primary">Counter-Slice</span>
            <span className="text-sm text-on-surface-variant truncate max-w-xs">{fileName}</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Extract Mode</span>
          </div>
          <Link href="/" className="text-sm text-on-surface-variant hover:text-on-surface">
            ← Upload New
          </Link>
        </nav>

        {/* Main layout */}
        <div className="flex-1 grid grid-cols-[1fr_360px] overflow-hidden">
          {/* Left: PDF viewer */}
          <div className="overflow-hidden">
            <ExtractViewer
              pdfData={pdfData}
              pageIndex={pageIndex}
              pageCount={pageCount}
              blocks={extractBlocks}
              selectedBlockId={selectedBlockId}
              onPageChange={setPageIndex}
              onScanComplete={setExtractItemCounts}
            />
          </div>

          {/* Right: sidebar */}
          <div className="border-l border-outline-variant flex flex-col overflow-hidden bg-surface">
            <div className="border-b border-outline-variant">
              <ColorMappingPanel />
            </div>
            <div className="border-b border-outline-variant">
              <EquipmentNamesTable />
            </div>
            <div className="flex-1 overflow-hidden">
              <ResultsPanel onSelectBlock={handleSelectBlock} fileName={fileName} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
