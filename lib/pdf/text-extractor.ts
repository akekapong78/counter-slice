import type { PDFPageProxy } from 'pdfjs-dist'
import type { TextItem, RawTextBlock } from '@/lib/types'

const SET_FILL_RGB = 58
const SET_TEXT_MATRIX = 70
const SHOW_TEXT = 43
const SHOW_SPACED_TEXT = 44

// Y proximity to merge lines into block
const BLOCK_Y_GAP = 40

type GlyphSegment = {
  text: string
  x: number
  y: number
  color: [number, number, number]
}

export function parseItems(text: string): TextItem[] {
  const results: TextItem[] = []
  const regex = /([A-Z0-9][A-Z0-9\-\.,\/]*?)\s*(?:\[([A-Z]+)\]|\(([A-Z]+)\))/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(text)) !== null) {
    const code = match[1].trim()
    const actionStr = (match[2] ?? match[3] ?? '').toUpperCase()
    if (actionStr === 'RM' || actionStr === 'IN' || actionStr === 'RP') {
      results.push({ code, action: actionStr as 'RM' | 'IN' | 'RP' })
    }
  }
  return results
}

async function collectSegments(page: PDFPageProxy): Promise<GlyphSegment[]> {
  const { fnArray, argsArray } = await page.getOperatorList()
  const segments: GlyphSegment[] = []
  let fillColor: [number, number, number] = [0, 0, 0]
  let curX = 0
  let curY = 0

  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i]
    const args = argsArray[i]

    if (fn === SET_FILL_RGB) {
      const c = args[0] as Uint8ClampedArray
      fillColor = [c[0], c[1], c[2]]
    } else if (fn === SET_TEXT_MATRIX) {
      curX = args[4] as number
      curY = args[5] as number
    } else if (fn === SHOW_TEXT || fn === SHOW_SPACED_TEXT) {
      // args[0] may be an array of glyphs, or an array containing an array of glyphs
      let raw = Array.isArray(args[0]) ? args[0] : []
      const glyphs = (raw.length > 0 && Array.isArray(raw[0]))
        ? (raw[0] as unknown[])
        : raw
      let str = ''
      for (const g of glyphs) {
        if (g && (g as { unicode?: string }).unicode) {
          str += (g as { unicode: string }).unicode
        }
      }
      if (str.trim()) {
        segments.push({ text: str, x: curX, y: curY, color: [...fillColor] as [number, number, number] })
      }
    }
  }
  return segments
}

function clusterIntoBlocks(
  segments: GlyphSegment[],
  pageWidth: number,
  pageHeight: number,
  pageIndex: number
): RawTextBlock[] {
  if (segments.length === 0) return []

  // Sort by Y descending (PDF y=0 is bottom), then X ascending
  const sorted = [...segments].sort((a, b) => b.y - a.y || a.x - b.x)

  const blocks: RawTextBlock[] = []
  let current: GlyphSegment[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const seg = sorted[i]
    const lastY = current[current.length - 1].y
    const yDiff = Math.abs(lastY - seg.y)

    if (yDiff <= BLOCK_Y_GAP) {
      current.push(seg)
    } else {
      pushBlock(current, pageWidth, pageHeight, pageIndex, blocks)
      current = [seg]
    }
  }
  pushBlock(current, pageWidth, pageHeight, pageIndex, blocks)

  return blocks.filter((b) => b.items.length > 0)
}

function pushBlock(
  segs: GlyphSegment[],
  pageWidth: number,
  pageHeight: number,
  pageIndex: number,
  out: RawTextBlock[]
) {
  const rawText = segs.map((s) => s.text).join('')
  const items = parseItems(rawText)
  if (items.length === 0) return

  const xs = segs.map((s) => s.x)
  const ys = segs.map((s) => s.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  // Dominant color = most frequent
  const colorKey = (c: [number, number, number]) => c.join(',')
  const freq: Record<string, { color: [number, number, number]; count: number }> = {}
  for (const s of segs) {
    const k = colorKey(s.color)
    if (!freq[k]) freq[k] = { color: s.color, count: 0 }
    freq[k].count++
  }
  const dominant = Object.values(freq).sort((a, b) => b.count - a.count)[0].color

  out.push({ rawText, x, y, pageWidth, pageHeight, pageIndex, color: dominant, items })
}

export async function detectExtractMode(page: PDFPageProxy): Promise<boolean> {
  const segments = await collectSegments(page)
  const allText = segments.map((s) => s.text).join('')
  return /\[RM\]|\[IN\]|\[RP\]|\(RM\)|\(IN\)|\(RP\)/.test(allText)
}

export async function extractTextBlocks(
  page: PDFPageProxy,
  pageIndex: number
): Promise<RawTextBlock[]> {
  const viewport = page.getViewport({ scale: 1 })
  const segments = await collectSegments(page)
  return clusterIntoBlocks(segments, viewport.width, viewport.height, pageIndex)
}
