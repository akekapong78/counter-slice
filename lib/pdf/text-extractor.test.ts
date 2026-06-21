// lib/pdf/text-extractor.test.ts
import { describe, it, expect } from 'vitest'
import { parseItems, detectExtractMode, extractTextBlocks } from './text-extractor'
import type { PDFPageProxy } from 'pdfjs-dist'

// Helper: build a mock PDFPageProxy from operator arrays
function mockPage(
  ops: Array<{ fn: number; args: unknown[] }>,
  width = 1000,
  height = 800
): PDFPageProxy {
  return {
    getViewport: () => ({ width, height }),
    getOperatorList: async () => ({
      fnArray: ops.map((o) => o.fn),
      argsArray: ops.map((o) => o.args),
    }),
  } as unknown as PDFPageProxy
}

const SET_FILL_RGB = 58
const SET_TEXT_MATRIX = 70
const SHOW_TEXT = 43

// Helper: wrap glyphs in an extra array layer for testing.
// NOTE: This double-array wrapping is a MOCK ARTIFACT, not how real PDF.js works.
// Real PDF.js SHOW_TEXT args[0] is [glyph, ...]; our mock wraps it one level deeper
// to test the unwrapping logic in collectSegments().
function glyphArgs(str: string) {
  return [str.split('').map((c) => ({ unicode: c }))]
}

describe('parseItems', () => {
  it('parses bracket RM tag', () => {
    expect(parseItems('12-Y[RM]')).toEqual([{ code: '12-Y', action: 'RM' }])
  })

  it('parses paren IN tag', () => {
    expect(parseItems('DDE(IN)')).toEqual([{ code: 'DDE', action: 'IN' }])
  })

  it('parses RP tag', () => {
    expect(parseItems('M1P2W(RP)')).toEqual([{ code: 'M1P2W', action: 'RP' }])
  })

  it('parses multiple items in one string', () => {
    expect(parseItems('12-Y(RM)OHGW[RM]SP [RM]')).toEqual([
      { code: '12-Y', action: 'RM' },
      { code: 'OHGW', action: 'RM' },
      { code: 'SP', action: 'RM' },
    ])
  })

  it('parses mixed RM and IN in same string', () => {
    expect(parseItems('DDE[IN]GY-32(RM)')).toEqual([
      { code: 'DDE', action: 'IN' },
      { code: 'GY-32', action: 'RM' },
    ])
  })

  it('ignores unknown tags', () => {
    expect(parseItems('FOO[XX]BAR(IN)')).toEqual([{ code: 'BAR', action: 'IN' }])
  })

  it('returns empty array for plain text', () => {
    expect(parseItems('แบบเลขที่')).toEqual([])
  })
})

describe('detectExtractMode', () => {
  it('returns true when page contains [RM] tagged text', async () => {
    const page = mockPage([
      { fn: SET_TEXT_MATRIX, args: [1, 0, 0, 1, 100, 200] },
      { fn: SHOW_TEXT, args: [glyphArgs('12-Y[RM]')] },
    ])
    expect(await detectExtractMode(page)).toBe(true)
  })

  it('returns true when page contains (IN) tagged text', async () => {
    const page = mockPage([
      { fn: SET_TEXT_MATRIX, args: [1, 0, 0, 1, 100, 200] },
      { fn: SHOW_TEXT, args: [glyphArgs('DDE(IN)')] },
    ])
    expect(await detectExtractMode(page)).toBe(true)
  })

  it('returns false for plain text page', async () => {
    const page = mockPage([
      { fn: SET_TEXT_MATRIX, args: [1, 0, 0, 1, 100, 200] },
      { fn: SHOW_TEXT, args: [glyphArgs('แบบเลขที่')] },
    ])
    expect(await detectExtractMode(page)).toBe(false)
  })
})

describe('extractTextBlocks', () => {
  it('extracts a block with RM items from red text', async () => {
    const page = mockPage([
      { fn: SET_FILL_RGB, args: [new Uint8ClampedArray([255, 0, 0])] },
      { fn: SET_TEXT_MATRIX, args: [1, 0, 0, 1, 100, 400] },
      { fn: SHOW_TEXT, args: [glyphArgs('12-Y[RM]OHGW[RM]')] },
    ])
    const blocks = await extractTextBlocks(page, 0)
    expect(blocks.length).toBeGreaterThan(0)
    expect(blocks[0].items).toContainEqual({ code: '12-Y', action: 'RM' })
    expect(blocks[0].color).toEqual([255, 0, 0])
  })

  it('ignores blocks with no tagged items', async () => {
    const page = mockPage([
      { fn: SET_FILL_RGB, args: [new Uint8ClampedArray([0, 0, 0])] },
      { fn: SET_TEXT_MATRIX, args: [1, 0, 0, 1, 100, 400] },
      { fn: SHOW_TEXT, args: [glyphArgs('แบบเลขที่')] },
    ])
    const blocks = await extractTextBlocks(page, 0)
    expect(blocks).toHaveLength(0)
  })

  it('separates blocks that are far apart vertically', async () => {
    const page = mockPage([
      { fn: SET_FILL_RGB, args: [new Uint8ClampedArray([255, 0, 0])] },
      { fn: SET_TEXT_MATRIX, args: [1, 0, 0, 1, 100, 700] },
      { fn: SHOW_TEXT, args: [glyphArgs('SP[RM]')] },
      { fn: SET_TEXT_MATRIX, args: [1, 0, 0, 1, 100, 100] },
      { fn: SHOW_TEXT, args: [glyphArgs('CCB[IN]')] },
    ])
    const blocks = await extractTextBlocks(page, 0)
    expect(blocks.length).toBe(2)
  })
})
