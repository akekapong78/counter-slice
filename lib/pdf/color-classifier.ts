import type { RawTextBlock, ColorMapping, ExtractedBlock, Rect } from '@/lib/types'

// X-proximity fraction of the pole x-range used for column matching.
// Engineering drawings place pole labels and equipment in the same vertical column
// but at very different y positions, so y is not used as a matching criterion.
const POLE_X_FRACTION = 0.03

export function rgbToHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

function colorKey(rgb: [number, number, number]): string {
  return rgb.join(',')
}

function guessLabel(rgb: [number, number, number]): ColorMapping['label'] {
  const [r, g, b] = rgb
  if (r > 200 && g < 80 && b < 80) return 'RM'
  if (b > 150 && r < 80) return 'IN'
  return 'ignore'
}

export function autoGuessMapping(blocks: RawTextBlock[]): ColorMapping[] {
  const seen = new Map<string, ColorMapping>()
  for (const block of blocks) {
    const key = colorKey(block.color)
    if (!seen.has(key)) {
      seen.set(key, {
        rgb: block.color,
        hex: rgbToHex(block.color),
        label: guessLabel(block.color),
      })
    }
  }
  return Array.from(seen.values())
}

function findPoleId(
  block: RawTextBlock,
  poleBlocks: RawTextBlock[]
): string | null {
  const samePage = poleBlocks.filter((pb) => pb.pageIndex === block.pageIndex)
  if (samePage.length === 0) return null

  // Compute x-threshold from the spread of pole positions.
  // Engineering drawings align equipment in the same vertical column as the pole label,
  // but poles can be far apart — 3% of pole x-range captures nearby columns without
  // bleeding into adjacent poles.
  const poleXs = samePage.map((pb) => pb.x)
  const xRange = Math.max(Math.max(...poleXs) - Math.min(...poleXs), block.pageWidth)
  const xThresh = xRange * POLE_X_FRACTION

  let best: { id: string; dx: number } | null = null
  for (const pb of samePage) {
    const dx = Math.abs(pb.x - block.x)
    if (dx <= xThresh) {
      const match = pb.rawText.match(/P\d+/)
      if (match && (!best || dx < best.dx)) {
        best = { id: match[0], dx }
      }
    }
  }
  return best ? best.id : null
}

export function resolveBlocks(
  blocks: RawTextBlock[],
  mappings: ColorMapping[],
  poleBlocks: RawTextBlock[]
): ExtractedBlock[] {
  const mappingMap = new Map(mappings.map((m) => [colorKey(m.rgb), m.label]))

  return blocks.map((block, i) => {
    const label = mappingMap.get(colorKey(block.color)) ?? 'ignore'
    const action: ExtractedBlock['action'] =
      label === 'RM' || label === 'IN' || label === 'RP' ? label : 'unknown'

    // Normalize bbox: PDF y is bottom-up → flip to top-down
    const bboxX = block.x / block.pageWidth
    const bboxY = 1 - block.y / block.pageHeight
    const bbox: Rect = {
      x: bboxX,
      y: bboxY,
      width: block.width / block.pageWidth,
      height: block.height / block.pageHeight,
    }

    return {
      id: `block-${block.pageIndex}-${i}`,
      poleId: findPoleId(block, poleBlocks),
      pageIndex: block.pageIndex,
      bbox,
      color: block.color,
      action,
      items: block.items,
    }
  })
}
