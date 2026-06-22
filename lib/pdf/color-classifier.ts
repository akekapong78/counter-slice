import type { RawTextBlock, ColorMapping, ExtractedBlock, Rect } from '@/lib/types'

const POLE_Y_THRESHOLD = 50
const POLE_X_THRESHOLD = 80

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
  for (const pb of poleBlocks) {
    if (pb.pageIndex !== block.pageIndex) continue
    const dx = Math.abs(pb.x - block.x)
    const dy = Math.abs(pb.y - block.y)
    if (dx <= POLE_X_THRESHOLD && dy <= POLE_Y_THRESHOLD) {
      const match = pb.rawText.match(/P\d+/)
      if (match) return match[0]
    }
  }
  return null
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
