'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { pdfjs } from '@/lib/pdf/pdfjs-setup'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { ExtractedBlock } from '@/lib/types'

type Props = {
  pdfData: ArrayBuffer
  pageIndex: number
  pageCount: number
  blocks: ExtractedBlock[]
  selectedBlockId: string | null
  onPageChange: (index: number) => void
}

const MIN_SCALE = 0.3
const MAX_SCALE = 5

export function ExtractViewer({ pdfData, pageIndex, pageCount, blocks, selectedBlockId, onPageChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null)
  const [scale, setScale] = useState(1.2)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  // Load PDF once
  useEffect(() => {
    pdfjs.getDocument({ data: pdfData.slice(0) }).promise.then((doc) => {
      pdfDocRef.current = doc
    })
  }, [pdfData])

  // Render page on scale/page change
  useEffect(() => {
    const doc = pdfDocRef.current
    if (!doc || !canvasRef.current) return
    let cancelled = false

    doc.getPage(pageIndex + 1).then((page) => {
      if (cancelled) return
      const viewport = page.getViewport({ scale })
      const canvas = canvasRef.current!
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!
      void page.render({ canvasContext: ctx, viewport }).promise
    })

    return () => { cancelled = true }
  }, [pageIndex, scale])

  // Pan handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }, [offset])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return
    setOffset({
      x: panStart.current.ox + e.clientX - panStart.current.x,
      y: panStart.current.oy + e.clientY - panStart.current.y,
    })
  }, [isPanning])

  const onMouseUp = useCallback(() => setIsPanning(false), [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s - e.deltaY * 0.001)))
  }, [])

  // Fit page
  const fitPage = useCallback(() => {
    if (!containerRef.current || !canvasRef.current) return
    const cw = containerRef.current.clientWidth
    const ch = containerRef.current.clientHeight
    const canvas = canvasRef.current
    if (!canvas.width || !canvas.height) return
    const ratio = Math.min(cw / canvas.width, ch / canvas.height)
    setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, ratio)))
    setOffset({ x: 0, y: 0 })
  }, [])

  // Highlight selected block
  const pageBlocks = blocks.filter((b) => b.pageIndex === pageIndex)
  const canvas = canvasRef.current
  const cw = canvas?.width ?? 0
  const ch = canvas?.height ?? 0

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-outline-variant bg-surface text-sm">
        <button onClick={() => setScale((s) => Math.min(MAX_SCALE, s + 0.2))} className="px-2 py-1 rounded hover:bg-surface-container-low">＋</button>
        <button onClick={() => setScale((s) => Math.max(MIN_SCALE, s - 0.2))} className="px-2 py-1 rounded hover:bg-surface-container-low">－</button>
        <button onClick={fitPage} className="px-2 py-1 rounded hover:bg-surface-container-low">Fit</button>
        <span className="text-xs text-on-surface-variant ml-2">{Math.round(scale * 100)}%</span>
      </div>

      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative bg-surface-dim/30 cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        <div style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, display: 'inline-block' }}>
          <div className="relative">
            <canvas ref={canvasRef} className="shadow-xl" />
            <svg
              ref={svgRef}
              className="absolute inset-0 pointer-events-none"
              style={{ width: cw, height: ch }}
            >
              {pageBlocks.map((block) => {
                const isSelected = block.id === selectedBlockId
                const bx = block.bbox.x * cw
                const by = block.bbox.y * ch
                const bw = block.bbox.width * cw
                const bh = block.bbox.height * ch
                const stroke = block.action === 'RM' ? '#ef4444' : block.action === 'IN' ? '#3b82f6' : '#f59e0b'
                const fill = stroke + '33'
                return (
                  <rect
                    key={block.id}
                    x={bx} y={by} width={bw} height={bh}
                    fill={isSelected ? stroke + '55' : fill}
                    stroke={stroke}
                    strokeWidth={isSelected ? 2 : 1}
                    strokeDasharray={isSelected ? undefined : '4 2'}
                  />
                )
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Page navigation */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-4 py-2 border-t border-outline-variant bg-surface text-sm">
          <button
            onClick={() => onPageChange(Math.max(0, pageIndex - 1))}
            disabled={pageIndex === 0}
            className="px-3 py-1 rounded disabled:opacity-40 hover:bg-surface-container-low"
          >← Prev</button>
          <span className="text-on-surface-variant">Page {pageIndex + 1} of {pageCount}</span>
          <button
            onClick={() => onPageChange(Math.min(pageCount - 1, pageIndex + 1))}
            disabled={pageIndex === pageCount - 1}
            className="px-3 py-1 rounded disabled:opacity-40 hover:bg-surface-container-low"
          >Next →</button>
        </div>
      )}
    </div>
  )
}
