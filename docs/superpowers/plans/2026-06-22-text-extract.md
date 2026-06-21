# Text-Based Equipment Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/extract` flow that auto-detects PEA-style PDF drawings, clusters colored text blocks per pole, classifies equipment as RM/IN/RP, and exports a detail + summary report.

**Architecture:** After upload, `detectExtractMode()` scans page 1 for `[RM]`/`[IN]` tag patterns; if found, redirects to `/extract` instead of `/editor`. The extract page runs `extractTextBlocks()` (operator-list walker + Y/X proximity clustering), resolves block colors via user-configurable `ColorMapping`, and renders an interactive viewer (pan/zoom canvas + SVG highlight overlay) alongside a results panel.

**Tech Stack:** Next.js 14 (App Router), pdfjs-dist 4.x, Zustand 5, xlsx, jspdf, Vitest + jsdom

## Global Constraints

- Browser-only: no Node.js APIs in production code (`typeof window !== 'undefined'` guards where needed)
- All coordinates stored normalized 0–1 (same as existing zone system)
- PDF fill color arrives as `Uint8ClampedArray [r,g,b]` (0–255) from op fn=58
- RFC 4180 quote escaping in all CSV output (replace `"` with `""`)
- Path alias `@/` resolves to repo root (configured in `vitest.config.ts` and `tsconfig.json`)
- Run tests with `npm test`; run single file with `npx vitest run <path>`
- Commit after every task

---

### Task 1: New Types

**Files:**
- Modify: `lib/types.ts`

**Interfaces:**
- Produces: `ExtractedBlock`, `RawTextBlock`, `ColorMapping`, `EquipmentName`, `TextItem` — used by every subsequent task

- [ ] **Step 1: Add types to `lib/types.ts`**

Append after existing types:

```ts
// --- Extract feature types ---

export type TextItem = {
  code: string
  action: 'RM' | 'IN' | 'RP'
}

export type RawTextBlock = {
  rawText: string
  x: number        // PDF units, left edge (not normalized)
  y: number        // PDF units, baseline (not normalized)
  pageWidth: number
  pageHeight: number
  pageIndex: number
  color: [number, number, number]
  items: TextItem[]
}

export type ExtractedBlock = {
  id: string
  poleId: string | null
  pageIndex: number
  bbox: Rect          // normalized 0–1
  color: [number, number, number]
  action: 'RM' | 'IN' | 'RP' | 'unknown'
  items: TextItem[]
}

export type ColorMapping = {
  rgb: [number, number, number]
  hex: string
  label: 'RM' | 'IN' | 'RP' | 'ignore'
}

export type EquipmentName = {
  code: string
  nameTh: string
  unit: string
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add extract feature types"
```

---

### Task 2: Item Parser + Text Extractor

**Files:**
- Create: `lib/pdf/text-extractor.ts`
- Create: `lib/pdf/text-extractor.test.ts`

**Interfaces:**
- Consumes: `TextItem`, `RawTextBlock` from `@/lib/types`
- Produces:
  - `parseItems(text: string): TextItem[]`
  - `detectExtractMode(page: PDFPageProxy): Promise<boolean>`
  - `extractTextBlocks(page: PDFPageProxy, pageIndex: number): Promise<RawTextBlock[]>`

- [ ] **Step 1: Write failing tests**

```ts
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
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run lib/pdf/text-extractor.test.ts
```
Expected: FAIL — "Cannot find module './text-extractor'"

- [ ] **Step 3: Implement `lib/pdf/text-extractor.ts`**

```ts
import type { PDFPageProxy } from 'pdfjs-dist'
import type { TextItem, RawTextBlock } from '@/lib/types'

const SET_FILL_RGB = 58
const SET_TEXT_MATRIX = 70
const SHOW_TEXT = 43
const SHOW_SPACED_TEXT = 44

// Y proximity to merge glyphs into same line; X proximity to merge lines into block
const LINE_Y_THRESHOLD = 8
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
      const glyphs = Array.isArray(args[0]) ? args[0] : []
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
  return /\[RM\]|\[IN\]|\(RM\)|\(IN\)/.test(allText)
}

export async function extractTextBlocks(
  page: PDFPageProxy,
  pageIndex: number
): Promise<RawTextBlock[]> {
  const viewport = page.getViewport({ scale: 1 })
  const segments = await collectSegments(page)
  return clusterIntoBlocks(segments, viewport.width, viewport.height, pageIndex)
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run lib/pdf/text-extractor.test.ts
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add lib/pdf/text-extractor.ts lib/pdf/text-extractor.test.ts
git commit -m "feat: add text block extractor with item parser"
```

---

### Task 3: Color Classifier

**Files:**
- Create: `lib/pdf/color-classifier.ts`
- Create: `lib/pdf/color-classifier.test.ts`

**Interfaces:**
- Consumes: `RawTextBlock`, `ColorMapping`, `ExtractedBlock` from `@/lib/types`
- Produces:
  - `autoGuessMapping(blocks: RawTextBlock[]): ColorMapping[]`
  - `resolveBlocks(blocks: RawTextBlock[], mappings: ColorMapping[], poleBlocks: RawTextBlock[]): ExtractedBlock[]`
  - `rgbToHex(rgb: [number, number, number]): string`

- [ ] **Step 1: Write failing tests**

```ts
// lib/pdf/color-classifier.test.ts
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
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run lib/pdf/color-classifier.test.ts
```
Expected: FAIL — "Cannot find module './color-classifier'"

- [ ] **Step 3: Implement `lib/pdf/color-classifier.ts`**

```ts
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
    const bbox: Rect = { x: bboxX, y: bboxY, width: 0.08, height: 0.04 }

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
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx vitest run lib/pdf/color-classifier.test.ts
```
Expected: all PASS

- [ ] **Step 5: Run full test suite**

```bash
npm test
```
Expected: all existing tests still pass

- [ ] **Step 6: Commit**

```bash
git add lib/pdf/color-classifier.ts lib/pdf/color-classifier.test.ts
git commit -m "feat: add color classifier for RM/IN/RP block resolution"
```

---

### Task 4: Store Extension

**Files:**
- Modify: `lib/state/project-store.ts`
- Modify: `lib/state/project-store.test.ts`

**Interfaces:**
- Consumes: `ExtractedBlock`, `ColorMapping`, `EquipmentName` from `@/lib/types`
- Produces: `useProjectStore` extended with `extractBlocks`, `colorMappings`, `equipmentNames` and their setters

- [ ] **Step 1: Write failing tests for new store actions**

Add to `lib/state/project-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { useProjectStore } from './project-store'
import type { ExtractedBlock, ColorMapping, EquipmentName } from '@/lib/types'

// Add this describe block to the existing test file:
describe('extract store slice', () => {
  beforeEach(() => {
    act(() => { useProjectStore.getState().reset() })
  })

  it('starts with empty extractBlocks', () => {
    expect(useProjectStore.getState().extractBlocks).toEqual([])
  })

  it('setExtractBlocks replaces blocks', () => {
    const block: ExtractedBlock = {
      id: 'b1', poleId: 'P351', pageIndex: 0,
      bbox: { x: 0.1, y: 0.2, width: 0.05, height: 0.03 },
      color: [255, 0, 0], action: 'RM',
      items: [{ code: '12-Y', action: 'RM' }],
    }
    act(() => { useProjectStore.getState().setExtractBlocks([block]) })
    expect(useProjectStore.getState().extractBlocks).toHaveLength(1)
  })

  it('upsertColorMapping adds new mapping', () => {
    const mapping: ColorMapping = { rgb: [255, 0, 0], hex: '#ff0000', label: 'RM' }
    act(() => { useProjectStore.getState().upsertColorMapping(mapping) })
    expect(useProjectStore.getState().colorMappings).toHaveLength(1)
  })

  it('upsertColorMapping updates existing mapping by rgb key', () => {
    const m1: ColorMapping = { rgb: [255, 0, 0], hex: '#ff0000', label: 'RM' }
    const m2: ColorMapping = { rgb: [255, 0, 0], hex: '#ff0000', label: 'IN' }
    act(() => { useProjectStore.getState().upsertColorMapping(m1) })
    act(() => { useProjectStore.getState().upsertColorMapping(m2) })
    const mappings = useProjectStore.getState().colorMappings
    expect(mappings).toHaveLength(1)
    expect(mappings[0].label).toBe('IN')
  })

  it('upsertEquipmentName adds new entry', () => {
    const name: EquipmentName = { code: '12-Y', nameTh: 'เสาคอนกรีต 12 เมตร', unit: 'ต้น' }
    act(() => { useProjectStore.getState().upsertEquipmentName(name) })
    expect(useProjectStore.getState().equipmentNames).toHaveLength(1)
  })

  it('upsertEquipmentName updates existing by code', () => {
    const n1: EquipmentName = { code: '12-Y', nameTh: 'เสา', unit: 'ต้น' }
    const n2: EquipmentName = { code: '12-Y', nameTh: 'เสาคอนกรีต 12 เมตร', unit: 'ต้น' }
    act(() => { useProjectStore.getState().upsertEquipmentName(n1) })
    act(() => { useProjectStore.getState().upsertEquipmentName(n2) })
    expect(useProjectStore.getState().equipmentNames[0].nameTh).toBe('เสาคอนกรีต 12 เมตร')
  })

  it('reset clears extract state', () => {
    act(() => {
      useProjectStore.getState().setExtractBlocks([{
        id: 'b1', poleId: null, pageIndex: 0,
        bbox: { x: 0, y: 0, width: 0.1, height: 0.1 },
        color: [0,0,0], action: 'unknown', items: [],
      }])
    })
    act(() => { useProjectStore.getState().reset() })
    expect(useProjectStore.getState().extractBlocks).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests — verify new tests fail**

```bash
npx vitest run lib/state/project-store.test.ts
```
Expected: new tests FAIL — `setExtractBlocks is not a function`

- [ ] **Step 3: Extend `lib/state/project-store.ts`**

Add to the `Actions` type and the store implementation. In `lib/state/project-store.ts`, add these fields:

After the existing `Actions` type block, append:

```ts
// Add to the Actions type:
  setExtractBlocks: (blocks: ExtractedBlock[]) => void
  upsertColorMapping: (mapping: ColorMapping) => void
  upsertEquipmentName: (name: EquipmentName) => void
```

Update the import at the top:
```ts
import type { Layer, ProjectState, ExtractedBlock, ColorMapping, EquipmentName } from '@/lib/types'
```

Update `initialState` to include:
```ts
  extractBlocks: [] as ExtractedBlock[],
  colorMappings: [] as ColorMapping[],
  equipmentNames: [] as EquipmentName[],
```

Add to `ProjectState` in `lib/types.ts`:
```ts
// Add to ProjectState type:
  extractBlocks: ExtractedBlock[]
  colorMappings: ColorMapping[]
  equipmentNames: EquipmentName[]
```

Add implementations in `create(...)`:
```ts
  setExtractBlocks: (blocks) => set({ extractBlocks: blocks }),

  upsertColorMapping: (mapping) =>
    set((state) => {
      const key = mapping.rgb.join(',')
      const existing = state.colorMappings.findIndex((m) => m.rgb.join(',') === key)
      if (existing >= 0) {
        const updated = [...state.colorMappings]
        updated[existing] = mapping
        return { colorMappings: updated }
      }
      return { colorMappings: [...state.colorMappings, mapping] }
    }),

  upsertEquipmentName: (name) =>
    set((state) => {
      const existing = state.equipmentNames.findIndex((n) => n.code === name.code)
      if (existing >= 0) {
        const updated = [...state.equipmentNames]
        updated[existing] = name
        return { equipmentNames: updated }
      }
      return { equipmentNames: [...state.equipmentNames, name] }
    }),
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
npm test
```
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts lib/state/project-store.ts lib/state/project-store.test.ts
git commit -m "feat: extend store with extract blocks, color mappings, equipment names"
```

---

### Task 5: Auto-Detect in Upload Page

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `detectExtractMode` from `@/lib/pdf/text-extractor`; `autoGuessMapping`, `resolveBlocks` from `@/lib/pdf/color-classifier`; `extractTextBlocks` from `@/lib/pdf/text-extractor`

- [ ] **Step 1: Update `app/page.tsx`**

Replace `handleFile` callback with this updated version (keep all other code unchanged):

```ts
// Add imports at top:
import { detectExtractMode, extractTextBlocks } from '@/lib/pdf/text-extractor'
import { autoGuessMapping, resolveBlocks } from '@/lib/pdf/color-classifier'

// In useProjectStore destructuring, add:
const { setFile, setLayers, setExtractBlocks, upsertColorMapping } = useProjectStore()

// Replace handleFile:
const handleFile = useCallback(async (file: File) => {
  setIsProcessing(true)
  setError(null)
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer.slice(0) }).promise

    const page1 = await pdfDoc.getPage(1)
    const isExtractMode = await detectExtractMode(page1)

    if (isExtractMode) {
      // Extract all pages
      const allRawBlocks = []
      for (let p = 0; p < pdfDoc.numPages; p++) {
        const page = await pdfDoc.getPage(p + 1)
        const blocks = await extractTextBlocks(page, p)
        allRawBlocks.push(...blocks)
      }
      // Pole blocks: blocks whose rawText matches P\d+ pattern (no items, just pole ID)
      const poleBlocks = allRawBlocks.filter((b) => /P\d+/.test(b.rawText) && b.items.length === 0)
      const equipBlocks = allRawBlocks.filter((b) => b.items.length > 0)

      const mappings = autoGuessMapping(equipBlocks)
      const resolved = resolveBlocks(equipBlocks, mappings, poleBlocks)

      setFile(file.name, pdfDoc.numPages, arrayBuffer)
      setExtractBlocks(resolved)
      mappings.forEach((m) => upsertColorMapping(m))
      router.push('/extract')
    } else {
      // Existing OCG/zone flow
      const ocgGroups = await extractOcgGroups(pdfDoc)
      const counts = await countObjectsForAllPages(pdfDoc, ocgGroups)
      setFile(file.name, pdfDoc.numPages, arrayBuffer)
      setLayers(
        ocgGroups.map((group, i) => ({
          id: crypto.randomUUID(),
          name: group.name,
          source: 'ocg' as const,
          ocgRef: group.ref,
          count: counts[group.ref] ?? 0,
          visible: group.defaultVisible,
          color: getLayerColor(i),
        }))
      )
      router.push('/editor')
    }
  } catch (err) {
    setError('Failed to process PDF. Please try a valid PDF file.')
    console.error(err)
  } finally {
    setIsProcessing(false)
  }
}, [router, setFile, setLayers, setExtractBlocks, upsertColorMapping])
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: auto-detect extract mode on upload, redirect to /extract"
```

---

### Task 6: Export Functions

**Files:**
- Create: `lib/export/extract-csv-export.ts`
- Create: `lib/export/extract-csv-export.test.ts`
- Create: `lib/export/extract-excel-export.ts`

**Interfaces:**
- Consumes: `ExtractedBlock`, `EquipmentName` from `@/lib/types`
- Produces:
  - `exportExtractCsvDetail(blocks: ExtractedBlock[], names: EquipmentName[]): string`
  - `exportExtractCsvSummary(blocks: ExtractedBlock[], names: EquipmentName[]): string`
  - `exportExtractExcel(blocks: ExtractedBlock[], names: EquipmentName[], fileName: string): void`

- [ ] **Step 1: Write failing tests**

```ts
// lib/export/extract-csv-export.test.ts
import { describe, it, expect } from 'vitest'
import { exportExtractCsvDetail, exportExtractCsvSummary } from './extract-csv-export'
import type { ExtractedBlock, EquipmentName } from '@/lib/types'

const block: ExtractedBlock = {
  id: 'b1', poleId: 'P351', pageIndex: 0,
  bbox: { x: 0.1, y: 0.2, width: 0.05, height: 0.03 },
  color: [255, 0, 0], action: 'RM',
  items: [
    { code: '12-Y', action: 'RM' },
    { code: 'OHGW', action: 'RM' },
  ],
}

const names: EquipmentName[] = [
  { code: '12-Y', nameTh: 'เสาคอนกรีต 12 เมตร', unit: 'ต้น' },
]

describe('exportExtractCsvDetail', () => {
  it('includes header row', () => {
    const csv = exportExtractCsvDetail([block], names)
    expect(csv.split('\n')[0]).toBe('page,poleId,action,code,nameTh,unit')
  })

  it('includes one row per item', () => {
    const csv = exportExtractCsvDetail([block], names)
    const rows = csv.trim().split('\n')
    expect(rows).toHaveLength(3) // header + 2 items
  })

  it('page number is 1-indexed', () => {
    const csv = exportExtractCsvDetail([block], names)
    expect(csv).toContain('1,P351')
  })

  it('uses nameTh from lookup when available', () => {
    const csv = exportExtractCsvDetail([block], names)
    expect(csv).toContain('เสาคอนกรีต 12 เมตร')
  })

  it('leaves nameTh empty when not in lookup', () => {
    const csv = exportExtractCsvDetail([block], [])
    expect(csv).toContain('12-Y,,')
  })

  it('escapes double quotes in nameTh', () => {
    const csv = exportExtractCsvDetail([block], [
      { code: '12-Y', nameTh: 'say "hello"', unit: 'ต้น' }
    ])
    expect(csv).toContain('"say ""hello"""')
  })
})

describe('exportExtractCsvSummary', () => {
  it('includes header row', () => {
    const csv = exportExtractCsvSummary([block], names)
    expect(csv.split('\n')[0]).toBe('code,nameTh,unit,RM,IN,RP')
  })

  it('aggregates counts per code', () => {
    const csv = exportExtractCsvSummary([block], names)
    const row12Y = csv.split('\n').find((r) => r.startsWith('12-Y'))!
    expect(row12Y).toContain('1')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx vitest run lib/export/extract-csv-export.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement `lib/export/extract-csv-export.ts`**

```ts
import type { ExtractedBlock, EquipmentName } from '@/lib/types'

function escapeCell(val: string): string {
  if (val.includes('"') || val.includes(',') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"'
  }
  return val
}

function row(cells: string[]): string {
  return cells.map(escapeCell).join(',')
}

function nameMap(names: EquipmentName[]): Map<string, EquipmentName> {
  return new Map(names.map((n) => [n.code, n]))
}

export function exportExtractCsvDetail(
  blocks: ExtractedBlock[],
  names: EquipmentName[]
): string {
  const lookup = nameMap(names)
  const lines = ['page,poleId,action,code,nameTh,unit']
  for (const block of blocks) {
    for (const item of block.items) {
      const entry = lookup.get(item.code)
      lines.push(row([
        String(block.pageIndex + 1),
        block.poleId ?? '',
        item.action,
        item.code,
        entry?.nameTh ?? '',
        entry?.unit ?? '',
      ]))
    }
  }
  return lines.join('\n')
}

export function exportExtractCsvSummary(
  blocks: ExtractedBlock[],
  names: EquipmentName[]
): string {
  const lookup = nameMap(names)
  const counts = new Map<string, { RM: number; IN: number; RP: number }>()

  for (const block of blocks) {
    for (const item of block.items) {
      if (!counts.has(item.code)) counts.set(item.code, { RM: 0, IN: 0, RP: 0 })
      counts.get(item.code)![item.action]++
    }
  }

  const lines = ['code,nameTh,unit,RM,IN,RP']
  for (const [code, c] of Array.from(counts.entries()).sort()) {
    const entry = lookup.get(code)
    lines.push(row([code, entry?.nameTh ?? '', entry?.unit ?? '', String(c.RM), String(c.IN), String(c.RP)]))
  }
  return lines.join('\n')
}
```

- [ ] **Step 4: Implement `lib/export/extract-excel-export.ts`**

```ts
import * as XLSX from 'xlsx'
import type { ExtractedBlock, EquipmentName } from '@/lib/types'
import { exportExtractCsvDetail, exportExtractCsvSummary } from './extract-csv-export'

function csvToSheet(csv: string): XLSX.WorkSheet {
  const rows = csv.split('\n').map((line) =>
    line.split(',').map((cell) => cell.replace(/^"|"$/g, '').replace(/""/g, '"'))
  )
  return XLSX.utils.aoa_to_sheet(rows)
}

export function exportExtractExcel(
  blocks: ExtractedBlock[],
  names: EquipmentName[],
  fileName: string
): void {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, csvToSheet(exportExtractCsvDetail(blocks, names)), 'Detail')
  XLSX.utils.book_append_sheet(wb, csvToSheet(exportExtractCsvSummary(blocks, names)), 'Summary')
  XLSX.writeFile(wb, `${fileName}-extract.xlsx`)
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run lib/export/extract-csv-export.test.ts
```
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add lib/export/extract-csv-export.ts lib/export/extract-csv-export.test.ts lib/export/extract-excel-export.ts
git commit -m "feat: add extract CSV and Excel export"
```

---

### Task 7: ExtractViewer Component

**Files:**
- Create: `components/extract/ExtractViewer.tsx`

**Interfaces:**
- Consumes: `pdfjs` from `@/lib/pdf/pdfjs-setup`; `ExtractedBlock` from `@/lib/types`
- Produces: `<ExtractViewer pdfData pageIndex selectedBlockId onPageChange />` — renders canvas with pan/zoom + SVG highlight overlay

- [ ] **Step 1: Create `components/extract/ExtractViewer.tsx`**

```tsx
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
      page.render({ canvasContext: ctx, viewport }).promise
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
    const ratio = Math.min(cw / canvasRef.current.width, ch / canvasRef.current.height)
    setScale((s) => s * ratio)
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/extract/ExtractViewer.tsx
git commit -m "feat: add ExtractViewer with pan/zoom and highlight overlay"
```

---

### Task 8: Sidebar Panels

**Files:**
- Create: `components/extract/ColorMappingPanel.tsx`
- Create: `components/extract/EquipmentNamesTable.tsx`

**Interfaces:**
- Consumes: `useProjectStore` (colorMappings, equipmentNames, upsertColorMapping, upsertEquipmentName, extractBlocks)

- [ ] **Step 1: Create `components/extract/ColorMappingPanel.tsx`**

```tsx
'use client'

import { useProjectStore } from '@/lib/state/project-store'

const LABEL_OPTIONS = ['RM', 'IN', 'RP', 'ignore'] as const

export function ColorMappingPanel() {
  const { colorMappings, upsertColorMapping } = useProjectStore()

  if (colorMappings.length === 0) {
    return <p className="text-xs text-on-surface-variant p-3">No colors detected yet.</p>
  }

  return (
    <div className="p-3 space-y-2">
      <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Color Mapping</h3>
      {colorMappings.map((m) => (
        <div key={m.hex} className="flex items-center gap-2">
          <div className="w-5 h-5 rounded border border-outline-variant flex-shrink-0" style={{ backgroundColor: m.hex }} />
          <span className="text-xs text-on-surface-variant font-mono">{m.hex}</span>
          <select
            value={m.label}
            onChange={(e) => upsertColorMapping({ ...m, label: e.target.value as typeof m.label })}
            className="ml-auto text-xs border border-outline-variant rounded px-1 py-0.5 bg-surface"
          >
            {LABEL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create `components/extract/EquipmentNamesTable.tsx`**

```tsx
'use client'

import { useProjectStore } from '@/lib/state/project-store'

export function EquipmentNamesTable() {
  const { equipmentNames, extractBlocks, upsertEquipmentName } = useProjectStore()

  // Collect all unique codes from blocks
  const allCodes = Array.from(
    new Set(extractBlocks.flatMap((b) => b.items.map((i) => i.code)))
  ).sort()

  // Ensure all codes have an entry (add empty ones)
  const nameMap = new Map(equipmentNames.map((n) => [n.code, n]))
  const rows = allCodes.map((code) => nameMap.get(code) ?? { code, nameTh: '', unit: '' })

  if (rows.length === 0) return null

  return (
    <div className="p-3">
      <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Equipment Names</h3>
      <div className="overflow-auto max-h-48">
        <table className="text-xs w-full">
          <thead>
            <tr className="text-on-surface-variant border-b border-outline-variant">
              <th className="text-left py-1 pr-2">Code</th>
              <th className="text-left py-1 pr-2">Thai Name</th>
              <th className="text-left py-1">Unit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code} className={`border-b border-outline-variant/40 ${row.nameTh === '' ? 'bg-yellow-50' : ''}`}>
                <td className="py-1 pr-2 font-mono text-on-surface">{row.code}</td>
                <td className="py-1 pr-2">
                  <input
                    value={row.nameTh}
                    onChange={(e) => upsertEquipmentName({ ...row, nameTh: e.target.value })}
                    placeholder="ชื่อภาษาไทย"
                    className="w-full bg-transparent border-b border-outline-variant/50 focus:border-primary outline-none text-xs"
                  />
                </td>
                <td className="py-1">
                  <input
                    value={row.unit}
                    onChange={(e) => upsertEquipmentName({ ...row, unit: e.target.value })}
                    placeholder="หน่วย"
                    className="w-20 bg-transparent border-b border-outline-variant/50 focus:border-primary outline-none text-xs"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add components/extract/ColorMappingPanel.tsx components/extract/EquipmentNamesTable.tsx
git commit -m "feat: add ColorMappingPanel and EquipmentNamesTable sidebar components"
```

---

### Task 9: Results Panel

**Files:**
- Create: `components/extract/ResultsPanel.tsx`

**Interfaces:**
- Consumes: `useProjectStore`; `exportExtractCsvDetail`, `exportExtractCsvSummary` from `@/lib/export/extract-csv-export`; `exportExtractExcel` from `@/lib/export/extract-excel-export`
- Produces: `<ResultsPanel onSelectBlock fileName />` — per-pole detail + summary + export buttons

- [ ] **Step 1: Create `components/extract/ResultsPanel.tsx`**

```tsx
'use client'

import { useState, useMemo } from 'react'
import { useProjectStore } from '@/lib/state/project-store'
import { exportExtractCsvDetail, exportExtractCsvSummary } from '@/lib/export/extract-csv-export'
import { exportExtractExcel } from '@/lib/export/extract-excel-export'

type FilterAction = 'all' | 'RM' | 'IN' | 'RP' | 'unknown'

type Props = {
  onSelectBlock: (id: string, pageIndex: number) => void
  fileName: string
}

function downloadCsv(content: string, name: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}

export function ResultsPanel({ onSelectBlock, fileName }: Props) {
  const { extractBlocks, equipmentNames, colorMappings } = useProjectStore()
  const [filter, setFilter] = useState<FilterAction>('all')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'detail' | 'summary'>('detail')

  // Re-resolve actions when colorMappings change
  const mappingMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const cm of colorMappings) m.set(cm.rgb.join(','), cm.label)
    return m
  }, [colorMappings])

  const resolvedBlocks = useMemo(() =>
    extractBlocks.map((b) => ({
      ...b,
      action: (mappingMap.get(b.color.join(',')) ?? 'unknown') as typeof b.action,
    })), [extractBlocks, mappingMap])

  const filtered = resolvedBlocks.filter((b) => {
    if (filter !== 'all' && b.action !== filter) return false
    if (search && !b.poleId?.toLowerCase().includes(search.toLowerCase()) &&
        !b.items.some((i) => i.code.toLowerCase().includes(search.toLowerCase()))) return false
    return true
  })

  // Summary: aggregate by code
  const summary = useMemo(() => {
    const map = new Map<string, { RM: number; IN: number; RP: number }>()
    for (const b of resolvedBlocks) {
      for (const item of b.items) {
        if (!map.has(item.code)) map.set(item.code, { RM: 0, IN: 0, RP: 0 })
        map.get(item.code)![item.action as 'RM' | 'IN' | 'RP']++
      }
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [resolvedBlocks])

  const nameMap = useMemo(() =>
    new Map(equipmentNames.map((n) => [n.code, n])), [equipmentNames])

  const actionBadge = (action: string) => {
    const colors: Record<string, string> = {
      RM: 'bg-red-100 text-red-700',
      IN: 'bg-blue-100 text-blue-700',
      RP: 'bg-yellow-100 text-yellow-700',
      unknown: 'bg-gray-100 text-gray-500',
    }
    return (
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors[action] ?? colors.unknown}`}>
        {action}
      </span>
    )
  }

  return (
    <div className="flex flex-col h-full text-sm">
      {/* Tabs */}
      <div className="flex border-b border-outline-variant">
        {(['detail', 'summary'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-medium capitalize border-b-2 transition-colors ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'
            }`}
          >{t}</button>
        ))}
      </div>

      {tab === 'detail' && (
        <>
          {/* Filter + Search */}
          <div className="flex gap-2 p-2 border-b border-outline-variant">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pole / code…"
              className="flex-1 text-xs border border-outline-variant rounded px-2 py-1 bg-surface outline-none focus:border-primary"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterAction)}
              className="text-xs border border-outline-variant rounded px-1 py-1 bg-surface"
            >
              {(['all', 'RM', 'IN', 'RP', 'unknown'] as const).map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Block list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.map((block) => (
              <button
                key={block.id}
                onClick={() => onSelectBlock(block.id, block.pageIndex)}
                className="w-full text-left px-3 py-2 border-b border-outline-variant/50 hover:bg-surface-container-low transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  {block.poleId && (
                    <span className="text-xs font-mono font-semibold text-on-surface">{block.poleId}</span>
                  )}
                  {actionBadge(block.action)}
                  <span className="text-[10px] text-on-surface-variant ml-auto">p.{block.pageIndex + 1}</span>
                </div>
                <div className="text-[11px] text-on-surface-variant leading-relaxed">
                  {block.items.map((i) => i.code).join(', ')}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-on-surface-variant p-4 text-center">No results</p>
            )}
          </div>
        </>
      )}

      {tab === 'summary' && (
        <div className="flex-1 overflow-auto">
          <table className="text-xs w-full">
            <thead className="sticky top-0 bg-surface border-b border-outline-variant">
              <tr>
                {['Code', 'Thai Name', 'Unit', 'RM', 'IN', 'RP'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-on-surface-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.map(([code, counts]) => {
                const entry = nameMap.get(code)
                return (
                  <tr key={code} className="border-b border-outline-variant/40 hover:bg-surface-container-low">
                    <td className="px-3 py-1.5 font-mono">{code}</td>
                    <td className="px-3 py-1.5 text-on-surface-variant">{entry?.nameTh ?? ''}</td>
                    <td className="px-3 py-1.5 text-on-surface-variant">{entry?.unit ?? ''}</td>
                    <td className="px-3 py-1.5 text-red-600 font-medium">{counts.RM || ''}</td>
                    <td className="px-3 py-1.5 text-blue-600 font-medium">{counts.IN || ''}</td>
                    <td className="px-3 py-1.5 text-yellow-600 font-medium">{counts.RP || ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Export buttons */}
      <div className="flex gap-2 p-3 border-t border-outline-variant">
        <button
          onClick={() => downloadCsv(exportExtractCsvDetail(resolvedBlocks, equipmentNames), `${fileName}-detail.csv`)}
          className="flex-1 text-xs bg-surface border border-outline-variant rounded py-1.5 hover:bg-surface-container-low"
        >Detail CSV</button>
        <button
          onClick={() => downloadCsv(exportExtractCsvSummary(resolvedBlocks, equipmentNames), `${fileName}-summary.csv`)}
          className="flex-1 text-xs bg-surface border border-outline-variant rounded py-1.5 hover:bg-surface-container-low"
        >Summary CSV</button>
        <button
          onClick={() => exportExtractExcel(resolvedBlocks, equipmentNames, fileName)}
          className="flex-1 text-xs bg-primary text-white rounded py-1.5 hover:bg-primary-container"
        >Excel</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/extract/ResultsPanel.tsx
git commit -m "feat: add ResultsPanel with per-pole detail, summary, and export"
```

---

### Task 10: `/extract` Page + Integration

**Files:**
- Create: `app/extract/page.tsx`

**Interfaces:**
- Consumes: all components from Tasks 7–9; `useProjectStore`; `setupPdfWorker`

- [ ] **Step 1: Create `app/extract/page.tsx`**

```tsx
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
  const { pdfData, fileName, pageCount, extractBlocks } = useProjectStore()
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)

  useEffect(() => { setupPdfWorker() }, [])
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
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```
Expected: all PASS

- [ ] **Step 3: Build production**

```bash
npm run build
```
Expected: build succeeds, `/extract` appears in routes output

- [ ] **Step 4: Start dev server and smoke test**

```bash
npm run dev
```
- Open http://localhost:3000
- Upload `example_data/0. ช่วงที่ 5 ทีม อาร์ม-อั้ม SPP กันกุล โกลก Final.pdf`
- Verify: redirects to `/extract` (not `/editor`)
- Verify: colored blocks visible on PDF
- Verify: Results panel shows per-pole items
- Verify: Summary tab shows aggregated counts
- Verify: Color Mapping panel shows detected colors
- Verify: Equipment Names table shows all codes
- Click a row in Results → verify highlight on PDF

- [ ] **Step 5: Commit**

```bash
git add app/extract/page.tsx
git commit -m "feat: add /extract page wiring all components together"
```

---

## Self-Review

**Spec coverage:**
- ✅ Auto-detect on upload → Task 5
- ✅ Text block clustering → Task 2
- ✅ Color mapping (auto + user-configurable) → Tasks 3, 8
- ✅ Equipment name lookup (editable) → Tasks 4, 8
- ✅ PDF viewer with pan/zoom → Task 7
- ✅ SVG highlight overlay → Task 7
- ✅ Per-pole detail panel → Task 9
- ✅ Summary aggregate table → Task 9
- ✅ Export CSV (detail + summary) → Task 6
- ✅ Export Excel (2-sheet) → Task 6
- ✅ Pole ID detection → Tasks 2, 3
- ✅ `/extract` page → Task 10
- ✅ Existing `/editor` flow unchanged → Task 5 (else branch)

**Type consistency check:**
- `ExtractedBlock.id` defined in Task 1, used in Tasks 3, 7, 9 ✅
- `RawTextBlock` produced by Task 2, consumed by Tasks 3, 5 ✅
- `resolveBlocks(equipBlocks, mappings, poleBlocks)` signature consistent across Tasks 3 and 5 ✅
- `upsertColorMapping` / `upsertEquipmentName` defined in Task 4, used in Tasks 5, 8 ✅
- `exportExtractCsvDetail(blocks, names)` defined in Task 6, used in Task 9 ✅
