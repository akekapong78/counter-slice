import type { PDFPageProxy } from 'pdfjs-dist'
import type { Rect } from '@/lib/types'

const OPS_MOVE_TO = 13
const OPS_LINE_TO = 14
const OPS_SET_TEXT_MATRIX = 70

const PAINT_OPS = new Set([
  19,  // stroke
  20,  // fill
  21,  // fillStroke
  43,  // showText
  44,  // showSpacedText
  85,  // paintImageXObject
  86,  // paintInlineImageXObject
])

function pointInRect(px: number, py: number, rect: Rect, vw: number, vh: number): boolean {
  const nx = px / vw
  const ny = 1 - py / vh  // PDF y is bottom-up; normalize to top-down
  return (
    nx >= rect.x &&
    nx <= rect.x + rect.width &&
    ny >= rect.y &&
    ny <= rect.y + rect.height
  )
}

export async function countObjectsInZone(
  page: PDFPageProxy,
  normalizedRect: Rect
): Promise<number> {
  const viewport = page.getViewport({ scale: 1 })
  const { width: vw, height: vh } = viewport
  const { fnArray, argsArray } = await page.getOperatorList()

  let count = 0
  let lastX = 0
  let lastY = 0

  for (let i = 0; i < fnArray.length; i++) {
    const op = fnArray[i]
    const args = argsArray[i]

    if (op === OPS_MOVE_TO || op === OPS_LINE_TO) {
      lastX = args[0]
      lastY = args[1]
    } else if (op === OPS_SET_TEXT_MATRIX) {
      lastX = args[4]
      lastY = args[5]
    } else if (PAINT_OPS.has(op)) {
      if (pointInRect(lastX, lastY, normalizedRect, vw, vh)) {
        count++
      }
    }
  }

  return count
}
