'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useProjectStore } from '@/lib/state/project-store'
import { countObjectsInZone } from '@/lib/pdf/zone-counter'
import { getLayerColor } from '@/lib/state/project-store'
import { pdfjs } from '@/lib/pdf/pdfjs-setup'
import type { Rect } from '@/lib/types'

type Props = {
  pageIndex: number
  onZoneComplete: () => void
}

type DrawState = { startX: number; startY: number; endX: number; endY: number }

export function ZoneDrawer({ pageIndex, onZoneComplete }: Props) {
  const overlayRef = useRef<SVGSVGElement>(null)
  const pdfDocRef = useRef<import('pdfjs-dist').PDFDocumentProxy | null>(null)
  const [drawing, setDrawing] = useState<DrawState | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const { pdfData, layers, addLayer } = useProjectStore()

  useEffect(() => {
    if (!pdfData) return
    pdfjs.getDocument({ data: pdfData.slice(0) }).promise.then((doc) => {
      pdfDocRef.current = doc
    })
  }, [pdfData])

  const getCoords = (e: React.MouseEvent) => {
    const rect = overlayRef.current!.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    }
  }

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const { x, y } = getCoords(e)
    setDrawing({ startX: x, startY: y, endX: x, endY: y })
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawing) return
    const { x, y } = getCoords(e)
    setDrawing((d) => d ? { ...d, endX: x, endY: y } : null)
  }, [drawing])

  const onMouseUp = useCallback(async () => {
    if (!drawing || !pdfData) return
    const zoneRect: Rect = {
      x: Math.min(drawing.startX, drawing.endX),
      y: Math.min(drawing.startY, drawing.endY),
      width: Math.abs(drawing.endX - drawing.startX),
      height: Math.abs(drawing.endY - drawing.startY),
    }
    setDrawing(null)
    if (zoneRect.width < 0.01 || zoneRect.height < 0.01) return

    setIsProcessing(true)
    try {
      const pdfDoc = pdfDocRef.current
      if (!pdfDoc) return
      const page = await pdfDoc.getPage(pageIndex + 1)
      const count = await countObjectsInZone(page, zoneRect)

      addLayer({
        id: crypto.randomUUID(),
        name: 'Untitled Zone',
        source: 'zone',
        zoneRect,
        zonePageIndex: pageIndex,
        count,
        visible: true,
        color: getLayerColor(layers.length),
      })
    } finally {
      setIsProcessing(false)
      onZoneComplete()
    }
  }, [drawing, pageIndex, addLayer, layers.length, onZoneComplete])

  const rect = drawing
    ? {
        x: Math.min(drawing.startX, drawing.endX),
        y: Math.min(drawing.startY, drawing.endY),
        w: Math.abs(drawing.endX - drawing.startX),
        h: Math.abs(drawing.endY - drawing.startY),
      }
    : null

  return (
    <svg
      ref={overlayRef}
      className="absolute inset-0 w-full h-full"
      style={{ cursor: isProcessing ? 'wait' : 'crosshair', zIndex: 10 }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={() => setDrawing(null)}
    >
      {rect && (
        <rect
          x={`${rect.x * 100}%`}
          y={`${rect.y * 100}%`}
          width={`${rect.w * 100}%`}
          height={`${rect.h * 100}%`}
          fill="rgba(0,65,200,0.1)"
          stroke="#0041c8"
          strokeWidth="2"
          strokeDasharray="6 3"
        />
      )}
      {isProcessing && (
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
          fill="#0041c8" fontSize="14" fontFamily="Inter, system-ui">
          Counting objects…
        </text>
      )}
    </svg>
  )
}
