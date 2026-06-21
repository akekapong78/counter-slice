import { describe, it, expect } from 'vitest'
import { autoGuessMapping, resolveBlocks, rgbToHex } from './color-classifier'
import type { RawTextBlock } from '@/lib/types'

function makeBlock(color: [number, number, number], overrides: Partial<RawTextBlock> = {}): RawTextBlock {
  return {
    rawText: '12-Y[RM]',
    x: 100, y: 400,
    pageWidth: 1000, pageHeight: 800,
    pageIndex: 0,
    color,
    items: [{ code: '12-Y', action: 'RM' }],
    ...overrides,
  }
}

describe('rgbToHex', () => {
  it('converts red', () => expect(rgbToHex([255, 0, 0])).toBe('#ff0000'))
  it('converts blue', () => expect(rgbToHex([0, 63, 255])).toBe('#003fff'))
  it('converts black', () => expect(rgbToHex([0, 0, 0])).toBe('#000000'))
})

describe('autoGuessMapping', () => {
  it('maps red-dominant color to RM', () => {
    const mappings = autoGuessMapping([makeBlock([255, 0, 0])])
    expect(mappings.find((m) => m.rgb[0] > 200)?.label).toBe('RM')
  })

  it('maps blue-dominant color to IN', () => {
    const mappings = autoGuessMapping([makeBlock([0, 63, 255])])
    expect(mappings.find((m) => m.rgb[2] > 150)?.label).toBe('IN')
  })

  it('maps ambiguous color to unknown → ignore', () => {
    const mappings = autoGuessMapping([makeBlock([128, 128, 128])])
    expect(mappings[0].label).toBe('ignore')
  })

  it('deduplicates identical colors', () => {
    const blocks = [makeBlock([255, 0, 0]), makeBlock([255, 0, 0])]
    expect(autoGuessMapping(blocks)).toHaveLength(1)
  })

  it('produces one entry per unique color', () => {
    const blocks = [makeBlock([255, 0, 0]), makeBlock([0, 63, 255])]
    expect(autoGuessMapping(blocks)).toHaveLength(2)
  })
})

describe('resolveBlocks', () => {
  const mappings = [
    { rgb: [255, 0, 0] as [number,number,number], hex: '#ff0000', label: 'RM' as const },
    { rgb: [0, 63, 255] as [number,number,number], hex: '#003fff', label: 'IN' as const },
  ]

  it('assigns action from color mapping', () => {
    const block = makeBlock([255, 0, 0])
    const [resolved] = resolveBlocks([block], mappings, [])
    expect(resolved.action).toBe('RM')
  })

  it('assigns unknown when color not in mappings', () => {
    const block = makeBlock([128, 128, 0])
    const [resolved] = resolveBlocks([block], mappings, [])
    expect(resolved.action).toBe('unknown')
  })

  it('normalizes bbox to 0-1', () => {
    const block = makeBlock([255, 0, 0], { x: 500, y: 400, pageWidth: 1000, pageHeight: 800 })
    const [resolved] = resolveBlocks([block], mappings, [])
    expect(resolved.bbox.x).toBeCloseTo(0.5)
    expect(resolved.bbox.y).toBeCloseTo(0.5)
  })

  it('detects poleId from nearby pole block', () => {
    const equipBlock = makeBlock([255, 0, 0], { x: 100, y: 400 })
    const poleBlock: RawTextBlock = {
      rawText: 'P351',
      x: 100, y: 420,
      pageWidth: 1000, pageHeight: 800,
      pageIndex: 0,
      color: [0, 63, 255],
      items: [],
    }
    const [resolved] = resolveBlocks([equipBlock], mappings, [poleBlock])
    expect(resolved.poleId).toBe('P351')
  })
})
