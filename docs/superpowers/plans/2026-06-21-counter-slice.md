# Counter-Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Counter-Slice, a browser-only Next.js 14 app that uploads PDFs, extracts OCG layers, counts graphic objects per layer, supports manual zone drawing, and exports results as PDF/CSV/Excel.

**Architecture:** Next.js 14 App Router with `output: 'export'` for static deployment. All PDF processing runs in the browser via pdfjs-dist Web Worker. State is managed by Zustand in-memory, serializable to JSON file for project save/restore.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, pdfjs-dist 4.x, Zustand 4.x, jsPDF 2.x + jspdf-autotable 3.x, SheetJS (xlsx), Vitest + @testing-library/react

## Global Constraints

- Next.js: 14.x, App Router only, `output: 'export'`
- TypeScript: strict mode
- All PDF processing: client-side only, no server API routes
- Design system: Precision Analytical System (primary `#0041c8`, surface `#f8f9ff`, font Inter)
- pdfjs-dist: 4.x, worker via CDN (`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs`)
- No backend, no localStorage persistence — state lives in Zustand + JSON file export/import
- Design reference screens in `design_by_stitch/` directory

---

### Task 1: Project Setup + Design Tokens + Vitest

**Files:**
- Create: `package.json` (via create-next-app)
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `app/layout.tsx`
- Create: `app/globals.css`

**Interfaces:**
- Produces: working `npm run dev`, `npm test`, Tailwind design tokens available globally

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/ake/Coding/innovation/counter-slice
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --yes
```

Expected: Next.js 14 project scaffolded in current directory.

- [ ] **Step 2: Install dependencies**

```bash
npm install pdfjs-dist@4.4.168 zustand jspdf jspdf-autotable xlsx
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitejs/plugin-react
```

- [ ] **Step 3: Configure next.config.ts**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig
```

- [ ] **Step 4: Configure Tailwind with design tokens**

Replace `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'surface': '#f8f9ff',
        'surface-dim': '#cbdbf5',
        'surface-bright': '#f8f9ff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#eff4ff',
        'surface-container': '#e5eeff',
        'surface-container-high': '#dce9ff',
        'surface-container-highest': '#d3e4fe',
        'on-surface': '#0b1c30',
        'on-surface-variant': '#434656',
        'inverse-surface': '#213145',
        'inverse-on-surface': '#eaf1ff',
        'outline': '#737688',
        'outline-variant': '#c3c5d9',
        'primary': '#0041c8',
        'on-primary': '#ffffff',
        'primary-container': '#0055ff',
        'on-primary-container': '#e3e6ff',
        'inverse-primary': '#b6c4ff',
        'secondary': '#565e74',
        'on-secondary': '#ffffff',
        'secondary-container': '#dae2fd',
        'on-secondary-container': '#5c647a',
        'error': '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-background': '#0b1c30',
        'background': '#f8f9ff',
        'surface-variant': '#d3e4fe',
        'surface-tint': '#004dea',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: {
        DEFAULT: '0.5rem',
        sm: '0.25rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 5: Configure Vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

Create `vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

Add test scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

- [ ] **Step 6: Create app/layout.tsx**

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Counter-Slice',
  description: 'PDF OCG Layer Counter',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-surface text-on-surface min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 7: Create app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@keyframes loading {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(300%); }
}

body {
  font-family: 'Inter', system-ui, sans-serif;
}
```

- [ ] **Step 8: Verify setup**

```bash
npm run dev
```

Expected: server starts at http://localhost:3000 with no TypeScript errors.

```bash
npm test
```

Expected: exits cleanly (no test files yet).

- [ ] **Step 9: Commit**

```bash
git init
git add .
git commit -m "feat: initialize Next.js 14 project with design tokens and Vitest"
```

---

### Task 2: Types + Zustand Project Store

**Files:**
- Create: `lib/types.ts`
- Create: `lib/state/project-store.ts`
- Create: `lib/state/project-store.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  // lib/types.ts
  export type Rect = { x: number; y: number; width: number; height: number }
  export type Layer = {
    id: string; name: string; source: 'ocg' | 'zone'
    ocgRef?: string; zoneRect?: Rect; zonePageIndex?: number
    count: number; visible: boolean; color: string
  }
  export type ProjectState = {
    fileName: string; pageCount: number; pdfData: ArrayBuffer | null
    layers: Layer[]; selectedLayerIds: string[]
  }

  // lib/state/project-store.ts
  export function useProjectStore(): ProjectState & Actions
  export function getLayerColor(index: number): string
  // Actions: setFile, setLayers, addLayer, updateLayer, removeLayer, toggleLayerVisible, setSelectedLayers, reset
  ```

- [ ] **Step 1: Write failing tests**

Create `lib/state/project-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useProjectStore } from './project-store'

describe('project-store', () => {
  beforeEach(() => {
    useProjectStore.getState().reset()
  })

  it('starts with empty state', () => {
    const state = useProjectStore.getState()
    expect(state.fileName).toBe('')
    expect(state.layers).toEqual([])
    expect(state.selectedLayerIds).toEqual([])
  })

  it('setFile stores fileName and pageCount', () => {
    const buf = new ArrayBuffer(8)
    useProjectStore.getState().setFile('test.pdf', 5, buf)
    const state = useProjectStore.getState()
    expect(state.fileName).toBe('test.pdf')
    expect(state.pageCount).toBe(5)
    expect(state.pdfData).toBe(buf)
  })

  it('addLayer adds a layer', () => {
    useProjectStore.getState().addLayer({
      id: 'layer-1', name: 'WALL', source: 'ocg',
      ocgRef: 'ocg-ref-1', count: 42, visible: true, color: '#3b82f6',
    })
    const { layers } = useProjectStore.getState()
    expect(layers).toHaveLength(1)
    expect(layers[0].name).toBe('WALL')
    expect(layers[0].count).toBe(42)
  })

  it('updateLayer updates name', () => {
    useProjectStore.getState().addLayer({
      id: 'layer-1', name: 'OLD', source: 'ocg', count: 0, visible: true, color: '#000',
    })
    useProjectStore.getState().updateLayer('layer-1', { name: 'NEW' })
    expect(useProjectStore.getState().layers[0].name).toBe('NEW')
  })

  it('toggleLayerVisible flips visible', () => {
    useProjectStore.getState().addLayer({
      id: 'layer-1', name: 'X', source: 'ocg', count: 0, visible: true, color: '#000',
    })
    useProjectStore.getState().toggleLayerVisible('layer-1')
    expect(useProjectStore.getState().layers[0].visible).toBe(false)
  })

  it('removeLayer removes by id', () => {
    useProjectStore.getState().addLayer({
      id: 'layer-1', name: 'X', source: 'ocg', count: 0, visible: true, color: '#000',
    })
    useProjectStore.getState().removeLayer('layer-1')
    expect(useProjectStore.getState().layers).toHaveLength(0)
  })

  it('setLayers replaces all layers', () => {
    useProjectStore.getState().setLayers([
      { id: 'a', name: 'A', source: 'ocg', count: 1, visible: true, color: '#f00' },
      { id: 'b', name: 'B', source: 'zone', count: 2, visible: true, color: '#0f0' },
    ])
    expect(useProjectStore.getState().layers).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run tests — verify fail**

```bash
npm test lib/state/project-store.test.ts
```

Expected: FAIL — "Cannot find module './project-store'"

- [ ] **Step 3: Create lib/types.ts**

```typescript
export type Rect = {
  x: number
  y: number
  width: number
  height: number
}

export type Layer = {
  id: string
  name: string
  source: 'ocg' | 'zone'
  ocgRef?: string
  zoneRect?: Rect
  zonePageIndex?: number
  count: number
  visible: boolean
  color: string
}

export type ProjectState = {
  fileName: string
  pageCount: number
  pdfData: ArrayBuffer | null
  layers: Layer[]
  selectedLayerIds: string[]
}
```

- [ ] **Step 4: Create lib/state/project-store.ts**

```typescript
import { create } from 'zustand'
import type { Layer, ProjectState } from '@/lib/types'

const LAYER_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

type Actions = {
  setFile: (fileName: string, pageCount: number, pdfData: ArrayBuffer) => void
  setLayers: (layers: Layer[]) => void
  addLayer: (layer: Layer) => void
  updateLayer: (id: string, patch: Partial<Layer>) => void
  removeLayer: (id: string) => void
  toggleLayerVisible: (id: string) => void
  setSelectedLayers: (ids: string[]) => void
  reset: () => void
}

const initialState: ProjectState = {
  fileName: '',
  pageCount: 0,
  pdfData: null,
  layers: [],
  selectedLayerIds: [],
}

export const useProjectStore = create<ProjectState & Actions>((set) => ({
  ...initialState,

  setFile: (fileName, pageCount, pdfData) =>
    set({ fileName, pageCount, pdfData, layers: [], selectedLayerIds: [] }),

  setLayers: (layers) => set({ layers }),

  addLayer: (layer) =>
    set((state) => ({ layers: [...state.layers, layer] })),

  updateLayer: (id, patch) =>
    set((state) => ({
      layers: state.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    })),

  removeLayer: (id) =>
    set((state) => ({
      layers: state.layers.filter((l) => l.id !== id),
      selectedLayerIds: state.selectedLayerIds.filter((sid) => sid !== id),
    })),

  toggleLayerVisible: (id) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l
      ),
    })),

  setSelectedLayers: (ids) => set({ selectedLayerIds: ids }),

  reset: () => set(initialState),
}))

export function getLayerColor(index: number): string {
  return LAYER_COLORS[index % LAYER_COLORS.length]
}
```

- [ ] **Step 5: Run tests — verify pass**

```bash
npm test lib/state/project-store.test.ts
```

Expected: PASS — 7 tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/state/
git commit -m "feat: add types and Zustand project store"
```

---

### Task 3: OCG Parser

**Files:**
- Create: `lib/pdf/ocg-parser.ts`
- Create: `lib/pdf/ocg-parser.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  // lib/pdf/ocg-parser.ts
  export type OcgGroup = { ref: string; name: string; defaultVisible: boolean }
  export async function extractOcgGroups(pdfDoc: PDFDocumentProxy): Promise<OcgGroup[]>
  ```

- [ ] **Step 1: Write failing tests**

Create `lib/pdf/ocg-parser.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { extractOcgGroups } from './ocg-parser'

function makeMockPdfDoc(groups: Record<string, { name: string }> | null) {
  return {
    getOptionalContentConfig: vi.fn().mockResolvedValue({
      getGroups: vi.fn().mockReturnValue(groups),
    }),
  } as any
}

describe('extractOcgGroups', () => {
  it('returns empty array when PDF has no OCG groups', async () => {
    const doc = makeMockPdfDoc(null)
    const result = await extractOcgGroups(doc)
    expect(result).toEqual([])
  })

  it('extracts OCG group names and refs', async () => {
    const doc = makeMockPdfDoc({
      '10 0 R': { name: 'WALL' },
      '11 0 R': { name: 'DOOR' },
    })
    const result = await extractOcgGroups(doc)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('WALL')
    expect(result[0].ref).toBe('10 0 R')
    expect(result[1].name).toBe('DOOR')
  })

  it('sets defaultVisible to true', async () => {
    const doc = makeMockPdfDoc({ '10 0 R': { name: 'X' } })
    const result = await extractOcgGroups(doc)
    expect(result[0].defaultVisible).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests — verify fail**

```bash
npm test lib/pdf/ocg-parser.test.ts
```

Expected: FAIL — "Cannot find module './ocg-parser'"

- [ ] **Step 3: Implement ocg-parser.ts**

Create `lib/pdf/ocg-parser.ts`:

```typescript
import type { PDFDocumentProxy } from 'pdfjs-dist'

export type OcgGroup = {
  ref: string
  name: string
  defaultVisible: boolean
}

export async function extractOcgGroups(pdfDoc: PDFDocumentProxy): Promise<OcgGroup[]> {
  const ocConfig = await pdfDoc.getOptionalContentConfig()
  const groups = ocConfig.getGroups()
  if (!groups) return []

  return Object.entries(groups).map(([ref, group]) => ({
    ref,
    name: group.name ?? ref,
    defaultVisible: true,
  }))
}
```

- [ ] **Step 4: Run tests — verify pass**

```bash
npm test lib/pdf/ocg-parser.test.ts
```

Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/pdf/ocg-parser.ts lib/pdf/ocg-parser.test.ts
git commit -m "feat: add OCG parser to extract PDF layer groups"
```

---

### Task 4: Object Counter (count objects per OCG layer)

**Files:**
- Create: `lib/pdf/object-counter.ts`
- Create: `lib/pdf/object-counter.test.ts`

**Interfaces:**
- Consumes: `PDFDocumentProxy`, `PDFPageProxy` from pdfjs-dist; `OcgGroup` from `./ocg-parser`
- Produces:
  ```typescript
  // lib/pdf/object-counter.ts
  export async function countObjectsPerPage(
    page: PDFPageProxy,
    ocgRefs: string[]
  ): Promise<Record<string, number>>

  export async function countObjectsForAllPages(
    pdfDoc: PDFDocumentProxy,
    ocgGroups: OcgGroup[]
  ): Promise<Record<string, number>>
  ```

- [ ] **Step 1: Write failing tests**

Create `lib/pdf/object-counter.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { countObjectsPerPage } from './object-counter'

const OPS = {
  beginMarkedContentProps: 72,
  endMarkedContent: 73,
  stroke: 19,
  fill: 20,
  paintImageXObject: 85,
  showText: 43,
}

function makeMockPage(fnArray: number[], argsArray: any[][]) {
  return {
    getOperatorList: vi.fn().mockResolvedValue({ fnArray, argsArray }),
  } as any
}

describe('countObjectsPerPage', () => {
  it('returns zero for all refs when no marked content', async () => {
    const page = makeMockPage([OPS.stroke, OPS.fill], [[], []])
    const result = await countObjectsPerPage(page, ['10 0 R', '11 0 R'])
    expect(result['10 0 R']).toBe(0)
    expect(result['11 0 R']).toBe(0)
  })

  it('counts paint operators inside OCG marked content', async () => {
    const fnArray = [OPS.beginMarkedContentProps, OPS.stroke, OPS.fill, OPS.endMarkedContent]
    const argsArray = [['/OC', { '10 0 R': true }], [], [], []]
    const page = makeMockPage(fnArray, argsArray)
    const result = await countObjectsPerPage(page, ['10 0 R', '11 0 R'])
    expect(result['10 0 R']).toBe(2)
    expect(result['11 0 R']).toBe(0)
  })

  it('counts image operators inside OCG', async () => {
    const fnArray = [OPS.beginMarkedContentProps, OPS.paintImageXObject, OPS.endMarkedContent]
    const argsArray = [['/OC', { '10 0 R': true }], ['img1'], []]
    const page = makeMockPage(fnArray, argsArray)
    const result = await countObjectsPerPage(page, ['10 0 R'])
    expect(result['10 0 R']).toBe(1)
  })

  it('handles nested non-OC marked content', async () => {
    const fnArray = [
      OPS.beginMarkedContentProps,
      OPS.stroke,
      OPS.beginMarkedContentProps,
      OPS.fill,
      OPS.endMarkedContent,
      OPS.endMarkedContent,
    ]
    const argsArray = [
      ['/OC', { '10 0 R': true }], [], ['Span', {}], [], [], [],
    ]
    const page = makeMockPage(fnArray, argsArray)
    const result = await countObjectsPerPage(page, ['10 0 R'])
    expect(result['10 0 R']).toBe(2)
  })
})
```

- [ ] **Step 2: Run tests — verify fail**

```bash
npm test lib/pdf/object-counter.test.ts
```

Expected: FAIL — "Cannot find module './object-counter'"

- [ ] **Step 3: Implement object-counter.ts**

Create `lib/pdf/object-counter.ts`:

```typescript
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import type { OcgGroup } from './ocg-parser'

const OPS_BEGIN_MARKED_CONTENT_PROPS = 72
const OPS_END_MARKED_CONTENT = 73

const PAINT_OPS = new Set([
  19,  // stroke
  20,  // fill
  21,  // fillStroke
  57,  // paintFormXObject
  82,  // paintJpegXObject
  85,  // paintImageXObject
  86,  // paintInlineImageXObject
  43,  // showText
  44,  // showSpacedText
  45,  // nextLineShowText
  46,  // nextLineSetSpacingShowText
])

export async function countObjectsPerPage(
  page: PDFPageProxy,
  ocgRefs: string[]
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const ref of ocgRefs) counts[ref] = 0

  const { fnArray, argsArray } = await page.getOperatorList()
  const ocgStack: (string | null)[] = []

  for (let i = 0; i < fnArray.length; i++) {
    const op = fnArray[i]
    const args = argsArray[i]

    if (op === OPS_BEGIN_MARKED_CONTENT_PROPS) {
      const tag = args[0]
      const props = args[1]
      if (tag === '/OC' && props && typeof props === 'object') {
        const matchedRef = ocgRefs.find((ref) => props[ref] !== undefined)
        ocgStack.push(matchedRef ?? null)
      } else {
        ocgStack.push(null)
      }
    } else if (op === OPS_END_MARKED_CONTENT) {
      ocgStack.pop()
    } else if (PAINT_OPS.has(op)) {
      for (let s = ocgStack.length - 1; s >= 0; s--) {
        const activeRef = ocgStack[s]
        if (activeRef !== null && counts[activeRef] !== undefined) {
          counts[activeRef]++
          break
        }
      }
    }
  }

  return counts
}

export async function countObjectsForAllPages(
  pdfDoc: PDFDocumentProxy,
  ocgGroups: OcgGroup[]
): Promise<Record<string, number>> {
  const refs = ocgGroups.map((g) => g.ref)
  const totalCounts: Record<string, number> = {}
  for (const ref of refs) totalCounts[ref] = 0

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum)
    const pageCounts = await countObjectsPerPage(page, refs)
    for (const ref of refs) totalCounts[ref] += pageCounts[ref] ?? 0
  }

  return totalCounts
}
```

- [ ] **Step 4: Run tests — verify pass**

```bash
npm test lib/pdf/object-counter.test.ts
```

Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/pdf/object-counter.ts lib/pdf/object-counter.test.ts
git commit -m "feat: add object counter for OCG layers via operator list"
```

---

### Task 5: Zone Counter

**Files:**
- Create: `lib/pdf/zone-counter.ts`
- Create: `lib/pdf/zone-counter.test.ts`

**Interfaces:**
- Consumes: `PDFPageProxy` from pdfjs-dist; `Rect` from `@/lib/types`
- Produces:
  ```typescript
  // lib/pdf/zone-counter.ts
  export async function countObjectsInZone(
    page: PDFPageProxy,
    normalizedRect: Rect  // x, y, width, height all 0–1
  ): Promise<number>
  ```

- [ ] **Step 1: Write failing tests**

Create `lib/pdf/zone-counter.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { countObjectsInZone } from './zone-counter'
import type { Rect } from '@/lib/types'

const OPS_MOVE_TO = 13
const OPS_STROKE = 19
const OPS_FILL = 20

function makeMockPage(fnArray: number[], argsArray: any[][], width = 100, height = 100) {
  return {
    getOperatorList: vi.fn().mockResolvedValue({ fnArray, argsArray }),
    getViewport: vi.fn().mockReturnValue({ width, height }),
  } as any
}

describe('countObjectsInZone', () => {
  it('returns 0 when no path operators', async () => {
    const page = makeMockPage([], [])
    const zone: Rect = { x: 0, y: 0, width: 1, height: 1 }
    expect(await countObjectsInZone(page, zone)).toBe(0)
  })

  it('counts stroke inside zone covering full page', async () => {
    const page = makeMockPage([OPS_MOVE_TO, OPS_STROKE], [[50, 50], []])
    const zone: Rect = { x: 0, y: 0, width: 1, height: 1 }
    expect(await countObjectsInZone(page, zone)).toBe(1)
  })

  it('does not count stroke outside zone', async () => {
    // moveTo(80,80) is in bottom-right, zone covers top-left
    const page = makeMockPage([OPS_MOVE_TO, OPS_STROKE], [[80, 80], []])
    const zone: Rect = { x: 0, y: 0, width: 0.4, height: 0.4 }
    expect(await countObjectsInZone(page, zone)).toBe(0)
  })

  it('counts multiple paint ops within zone', async () => {
    const page = makeMockPage(
      [OPS_MOVE_TO, OPS_STROKE, OPS_MOVE_TO, OPS_FILL],
      [[10, 10], [], [20, 20], []]
    )
    const zone: Rect = { x: 0, y: 0, width: 1, height: 1 }
    expect(await countObjectsInZone(page, zone)).toBe(2)
  })
})
```

- [ ] **Step 2: Run tests — verify fail**

```bash
npm test lib/pdf/zone-counter.test.ts
```

Expected: FAIL — "Cannot find module './zone-counter'"

- [ ] **Step 3: Implement zone-counter.ts**

Create `lib/pdf/zone-counter.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests — verify pass**

```bash
npm test lib/pdf/zone-counter.test.ts
```

Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/pdf/zone-counter.ts lib/pdf/zone-counter.test.ts
git commit -m "feat: add zone counter for user-drawn rectangles"
```

---

### Task 6: Export Functions (JSON, CSV, Excel, PDF Report)

**Files:**
- Create: `lib/export/json-io.ts`
- Create: `lib/export/csv-export.ts`
- Create: `lib/export/excel-export.ts`
- Create: `lib/export/pdf-report.ts`
- Create: `lib/export/json-io.test.ts`
- Create: `lib/export/csv-export.test.ts`

**Interfaces:**
- Consumes: `Layer[]`, `ProjectState` from `@/lib/types`
- Produces:
  ```typescript
  // json-io.ts
  export function exportProjectJson(state: { fileName: string; pageCount: number; layers: Layer[] }): void
  export async function importProjectJson(file: File): Promise<{ fileName: string; pageCount: number; layers: Layer[] }>

  // csv-export.ts
  export function exportCsv(layers: Layer[], fileName: string): void

  // excel-export.ts
  export async function exportExcel(layers: Layer[], fileName: string): Promise<void>

  // pdf-report.ts
  export async function exportPdfReport(layers: Layer[], fileName: string): Promise<void>
  ```

- [ ] **Step 1: Write failing tests**

Create `lib/export/json-io.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { importProjectJson } from './json-io'
import type { Layer } from '@/lib/types'

const sampleLayers: Layer[] = [
  { id: '1', name: 'WALL', source: 'ocg', ocgRef: '10 0 R', count: 42, visible: true, color: '#3b82f6' },
]

describe('importProjectJson', () => {
  it('parses valid JSON project file', async () => {
    const data = { fileName: 'test.pdf', pageCount: 3, layers: sampleLayers }
    const file = new File([JSON.stringify(data)], 'project.json', { type: 'application/json' })
    const result = await importProjectJson(file)
    expect(result.fileName).toBe('test.pdf')
    expect(result.pageCount).toBe(3)
    expect(result.layers).toHaveLength(1)
    expect(result.layers[0].name).toBe('WALL')
  })

  it('throws on invalid JSON', async () => {
    const file = new File(['not json'], 'bad.json', { type: 'application/json' })
    await expect(importProjectJson(file)).rejects.toThrow()
  })

  it('throws when layers field is missing', async () => {
    const file = new File([JSON.stringify({ fileName: 'x.pdf' })], 'bad.json')
    await expect(importProjectJson(file)).rejects.toThrow('missing layers')
  })
})
```

Create `lib/export/csv-export.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('exportCsv', () => {
  let createObjectURL: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createObjectURL = vi.fn().mockReturnValue('blob:mock')
    global.URL.createObjectURL = createObjectURL
    global.URL.revokeObjectURL = vi.fn()
    vi.spyOn(document.body, 'appendChild').mockImplementation((el: any) => {
      el.click = vi.fn()
      return el
    })
    vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el)
  })

  afterEach(() => { vi.restoreAllMocks() })

  it('triggers download with layer data in CSV', async () => {
    const { exportCsv } = await import('./csv-export')
    exportCsv(
      [{ id: '1', name: 'WALL', source: 'ocg', count: 42, visible: true, color: '#000' }],
      'test.pdf'
    )
    expect(createObjectURL).toHaveBeenCalledOnce()
    const blob: Blob = createObjectURL.mock.calls[0][0]
    const text = await blob.text()
    expect(text).toContain('WALL')
    expect(text).toContain('42')
    expect(text).toContain('Layer Name')
  })
})
```

- [ ] **Step 2: Run tests — verify fail**

```bash
npm test lib/export/json-io.test.ts lib/export/csv-export.test.ts
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Implement json-io.ts**

Create `lib/export/json-io.ts`:

```typescript
import type { Layer } from '@/lib/types'

type SerializableProject = {
  fileName: string
  pageCount: number
  layers: Layer[]
}

export function exportProjectJson(state: SerializableProject): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  triggerDownload(blob, `counter-slice-${state.fileName}.json`)
}

export async function importProjectJson(file: File): Promise<SerializableProject> {
  const text = await file.text()
  const data = JSON.parse(text) as SerializableProject
  if (!Array.isArray(data.layers)) throw new Error('Invalid project file: missing layers')
  return data
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 4: Implement csv-export.ts**

Create `lib/export/csv-export.ts`:

```typescript
import type { Layer } from '@/lib/types'

export function exportCsv(layers: Layer[], sourceFileName: string): void {
  const header = 'Layer Name,Count,Source,Visible\n'
  const rows = layers.map((l) => `"${l.name}",${l.count},${l.source},${l.visible}`).join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, sourceFileName.replace(/\.pdf$/i, '') + '-layers.csv')
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 5: Implement excel-export.ts**

Create `lib/export/excel-export.ts`:

```typescript
import type { Layer } from '@/lib/types'

export async function exportExcel(layers: Layer[], sourceFileName: string): Promise<void> {
  const XLSX = await import('xlsx')
  const rows = layers.map((l) => ({
    'Layer Name': l.name,
    'Count': l.count,
    'Source': l.source,
    'Visible': l.visible ? 'Yes' : 'No',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Layers')
  XLSX.writeFile(wb, sourceFileName.replace(/\.pdf$/i, '') + '-layers.xlsx')
}
```

- [ ] **Step 6: Implement pdf-report.ts**

Create `lib/export/pdf-report.ts`:

```typescript
import type { Layer } from '@/lib/types'

export async function exportPdfReport(layers: Layer[], sourceFileName: string): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const generatedAt = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const totalCount = layers.reduce((sum, l) => sum + l.count, 0)

  // Header bar
  doc.setFillColor(0, 65, 200)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text('Counter-Slice', 14, 12)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('PDF Layer Analysis Report', 14, 20)

  // Meta
  doc.setTextColor(11, 28, 48)
  doc.setFontSize(10)
  doc.text(`Document: ${sourceFileName}`, 14, 38)
  doc.text(`Generated: ${generatedAt}`, 14, 44)
  doc.text(`Total Layers: ${layers.length}`, 14, 50)
  doc.text(`Total Objects: ${totalCount.toLocaleString()}`, 14, 56)

  // Table
  autoTable(doc, {
    startY: 66,
    head: [['Layer Name', 'Object Count', 'Source', 'Status']],
    body: layers.map((l) => [
      l.name,
      l.count.toLocaleString(),
      l.source === 'ocg' ? 'OCG Layer' : 'Manual Zone',
      l.visible ? 'Active' : 'Hidden',
    ]),
    headStyles: { fillColor: [0, 65, 200], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [239, 244, 255] },
    styles: { fontSize: 10, cellPadding: 4 },
  })

  doc.save(sourceFileName.replace(/\.pdf$/i, '') + '-report.pdf')
}
```

- [ ] **Step 7: Run tests — verify pass**

```bash
npm test lib/export/
```

Expected: PASS — 5 tests pass (json-io + csv-export).

- [ ] **Step 8: Commit**

```bash
git add lib/export/
git commit -m "feat: add JSON, CSV, Excel, and PDF report export functions"
```

---

### Task 7: pdfjs Setup + Upload Screen

**Files:**
- Create: `lib/pdf/pdfjs-setup.ts`
- Create: `components/upload/Dropzone.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `useProjectStore()`, `extractOcgGroups`, `countObjectsForAllPages`, `getLayerColor`
- Produces: `/` route — upload PDF → extract layers → navigate to `/editor`

- [ ] **Step 1: Create pdfjs-setup.ts**

Create `lib/pdf/pdfjs-setup.ts`:

```typescript
import * as pdfjs from 'pdfjs-dist'

export function setupPdfWorker(): void {
  if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`
  }
}

export { pdfjs }
```

- [ ] **Step 2: Create Dropzone component**

Create `components/upload/Dropzone.tsx`:

```tsx
'use client'

import { useCallback, useRef, useState } from 'react'

type Props = {
  onFile: (file: File) => void
  isProcessing: boolean
}

export function Dropzone({ onFile, isProcessing }: Props) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (file.type === 'application/pdf') onFile(file)
  }, [onFile])

  return (
    <div
      className={`w-full max-w-3xl aspect-[16/9] border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer relative overflow-hidden
        ${isDragOver
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-outline-variant bg-surface-container-lowest hover:border-primary-container'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
      }}
      onClick={() => inputRef.current?.click()}
    >
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#0041c8 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      {isProcessing ? (
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center animate-pulse">
            <span className="material-symbols-outlined text-white text-3xl">sync</span>
          </div>
          <p className="text-xl font-semibold text-on-surface">Analyzing PDF layers…</p>
          <div className="w-64 h-1 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: '40%', animation: 'loading 1.5s ease-in-out infinite' }}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center px-6 z-10">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-primary/10 transition-transform duration-300 ${isDragOver ? 'scale-110' : ''}`}>
            <span className="material-symbols-outlined text-primary text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
          </div>
          <h2 className="text-xl font-semibold text-on-surface mb-1">Smart Upload</h2>
          <p className="text-base text-on-surface-variant mb-6">Drag and drop your PDF here or click to browse</p>
          <button className="bg-primary text-white px-8 py-3 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg hover:bg-primary-container transition-all active:scale-95">
            Upload PDF
          </button>
          <span className="mt-4 text-xs text-outline uppercase tracking-widest">Only PDF files supported</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Replace app/page.tsx**

```tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dropzone } from '@/components/upload/Dropzone'
import { useProjectStore } from '@/lib/state/project-store'
import { setupPdfWorker, pdfjs } from '@/lib/pdf/pdfjs-setup'
import { extractOcgGroups } from '@/lib/pdf/ocg-parser'
import { countObjectsForAllPages } from '@/lib/pdf/object-counter'
import { getLayerColor } from '@/lib/state/project-store'

export default function UploadPage() {
  const router = useRouter()
  const { setFile, setLayers } = useProjectStore()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { setupPdfWorker() }, [])

  const handleFile = useCallback(async (file: File) => {
    setIsProcessing(true)
    setError(null)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise
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
    } catch (err) {
      setError('Failed to process PDF. Please try a valid PDF file.')
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }, [router, setFile, setLayers])

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface border-b border-outline-variant">
        <div className="flex justify-between items-center px-8 h-16 max-w-[1440px] mx-auto">
          <span className="text-xl font-bold text-primary">Counter-Slice</span>
        </div>
      </nav>
      <main className="pt-16 min-h-screen flex flex-col items-center justify-center px-8">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-on-surface mb-4 max-w-2xl mx-auto">
            Count your PDF <span className="text-primary">layers precisely</span>.
          </h1>
          <p className="text-lg text-on-surface-variant max-w-xl mx-auto">
            Upload a PDF to extract OCG layers, count objects, and export structured reports.
          </p>
        </div>
        <Dropzone onFile={handleFile} isProcessing={isProcessing} />
        {error && <p className="mt-4 text-sm text-error">{error}</p>}
      </main>
    </>
  )
}
```

- [ ] **Step 4: Verify upload page in browser**

```bash
npm run dev
```

Open http://localhost:3000 — verify dropzone renders, drag-over state activates, no console errors.

- [ ] **Step 5: Commit**

```bash
git add lib/pdf/pdfjs-setup.ts components/upload/ app/page.tsx
git commit -m "feat: add upload screen with OCG extraction flow"
```

---

### Task 8: Layer Editor — PdfViewer + LayerSidebar + Editor Page

**Files:**
- Create: `components/editor/PdfViewer.tsx`
- Create: `components/editor/LayerSidebar.tsx`
- Create: `app/editor/page.tsx`

**Interfaces:**
- Consumes: `useProjectStore()`, `pdfjs` from `@/lib/pdf/pdfjs-setup`
- Produces: `/editor` split-view route with PDF canvas and layer management

- [ ] **Step 1: Create PdfViewer.tsx**

Create `components/editor/PdfViewer.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { pdfjs } from '@/lib/pdf/pdfjs-setup'
import type { PDFDocumentProxy } from 'pdfjs-dist'

type Props = {
  pdfData: ArrayBuffer
  pageIndex: number
  visibleOcgRefs: string[]
}

export type PdfViewerHandle = {
  getCanvas: () => HTMLCanvasElement | null
}

export const PdfViewer = forwardRef<PdfViewerHandle, Props>(function PdfViewer(
  { pdfData, pageIndex, visibleOcgRefs },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)

  useImperativeHandle(ref, () => ({ getCanvas: () => canvasRef.current }))

  useEffect(() => {
    let cancelled = false
    pdfjs.getDocument({ data: pdfData.slice(0) }).promise.then((doc) => {
      if (!cancelled) setPdfDoc(doc)
    })
    return () => { cancelled = true }
  }, [pdfData])

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return
    let cancelled = false
    let renderTask: ReturnType<ReturnType<PDFDocumentProxy['getPage']>['then']> | null = null

    const renderPage = async () => {
      const page = await pdfDoc.getPage(pageIndex + 1)
      if (cancelled) return

      const ocConfig = await pdfDoc.getOptionalContentConfig()
      const allGroups = ocConfig.getGroups()
      if (allGroups) {
        for (const ref of Object.keys(allGroups)) {
          ocConfig.setVisibility(ref, visibleOcgRefs.includes(ref))
        }
      }

      const viewport = page.getViewport({ scale: 1.2 })
      const canvas = canvasRef.current!
      canvas.width = viewport.width
      canvas.height = viewport.height
      const ctx = canvas.getContext('2d')!

      await page.render({
        canvasContext: ctx,
        viewport,
        optionalContentConfigPromise: Promise.resolve(ocConfig),
      }).promise
    }

    renderPage()
    return () => { cancelled = true }
  }, [pdfDoc, pageIndex, visibleOcgRefs])

  return (
    <div className="w-full h-full overflow-auto flex justify-center items-start p-4">
      <canvas ref={canvasRef} className="shadow-xl rounded-sm max-w-full" />
    </div>
  )
})
```

- [ ] **Step 2: Create LayerSidebar.tsx**

Create `components/editor/LayerSidebar.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useProjectStore } from '@/lib/state/project-store'

export function LayerSidebar() {
  const { layers, updateLayer, toggleLayerVisible, selectedLayerIds, setSelectedLayers } =
    useProjectStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const totalSelectedCount = layers
    .filter((l) => selectedLayerIds.includes(l.id))
    .reduce((sum, l) => sum + l.count, 0)

  const startEdit = (id: string, name: string) => {
    setEditingId(id)
    setEditName(name)
  }

  const commitEdit = (id: string) => {
    if (editName.trim()) updateLayer(id, { name: editName.trim() })
    setEditingId(null)
  }

  const toggleSelect = (id: string) => {
    setSelectedLayers(
      selectedLayerIds.includes(id)
        ? selectedLayerIds.filter((s) => s !== id)
        : [...selectedLayerIds, id]
    )
  }

  return (
    <aside className="h-full flex flex-col bg-white border-l border-outline-variant overflow-hidden">
      <div className="p-4 border-b border-outline-variant flex-shrink-0">
        <h2 className="text-base font-semibold text-on-surface">Layers</h2>
        <p className="text-xs text-on-surface-variant">{layers.length} detected</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {layers.length === 0 && (
          <p className="p-4 text-sm text-on-surface-variant">No layers found. Draw a zone to count manually.</p>
        )}
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={`flex items-center gap-2 px-4 py-3 border-b border-outline-variant/50 hover:bg-surface-container-low transition-colors
              ${selectedLayerIds.includes(layer.id) ? 'bg-surface-container-low' : ''}`}
          >
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: layer.color }} />

            <button
              onClick={() => toggleLayerVisible(layer.id)}
              className="text-on-surface-variant hover:text-primary transition-colors flex-shrink-0"
              title={layer.visible ? 'Hide layer' : 'Show layer'}
            >
              <span className="material-symbols-outlined text-base">
                {layer.visible ? 'visibility' : 'visibility_off'}
              </span>
            </button>

            <div className="flex-1 min-w-0">
              {editingId === layer.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => commitEdit(layer.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit(layer.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="w-full text-sm border border-primary rounded px-1 py-0.5 outline-none"
                />
              ) : (
                <button
                  onClick={() => startEdit(layer.id, layer.name)}
                  className="w-full text-left text-sm text-on-surface truncate hover:text-primary transition-colors"
                  title={`${layer.name} — click to rename`}
                >
                  {layer.name}
                  <span className="ml-1 text-[10px] text-outline uppercase">{layer.source}</span>
                </button>
              )}
            </div>

            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
              {layer.count.toLocaleString()}
            </span>

            <input
              type="checkbox"
              checked={selectedLayerIds.includes(layer.id)}
              onChange={() => toggleSelect(layer.id)}
              className="accent-primary flex-shrink-0"
              title="Include in summary"
            />
          </div>
        ))}
      </div>

      {selectedLayerIds.length > 0 && (
        <div className="p-4 border-t border-outline-variant bg-surface-container-low flex-shrink-0">
          <h3 className="text-xs font-semibold uppercase text-on-surface-variant mb-2">Selected Summary</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-on-surface-variant">
                <th className="text-left pb-1">Layer</th>
                <th className="text-right pb-1">Count</th>
              </tr>
            </thead>
            <tbody>
              {layers
                .filter((l) => selectedLayerIds.includes(l.id))
                .map((l) => (
                  <tr key={l.id}>
                    <td className="text-on-surface truncate max-w-[120px] py-0.5">{l.name}</td>
                    <td className="text-right font-semibold text-primary py-0.5">{l.count.toLocaleString()}</td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-outline-variant">
                <td className="pt-1 font-bold">Total</td>
                <td className="text-right pt-1 font-bold text-primary">{totalSelectedCount.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </aside>
  )
}
```

- [ ] **Step 3: Create app/editor/page.tsx**

Create directory `app/editor/` then create `app/editor/page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useProjectStore } from '@/lib/state/project-store'
import { setupPdfWorker } from '@/lib/pdf/pdfjs-setup'
import { PdfViewer } from '@/components/editor/PdfViewer'
import { LayerSidebar } from '@/components/editor/LayerSidebar'
import { ZoneDrawer } from '@/components/editor/ZoneDrawer'

export default function EditorPage() {
  const router = useRouter()
  const { pdfData, fileName, pageCount, layers } = useProjectStore()
  const [pageIndex, setPageIndex] = useState(0)
  const [isDrawingZone, setIsDrawingZone] = useState(false)

  useEffect(() => { setupPdfWorker() }, [])
  useEffect(() => { if (!pdfData) router.push('/') }, [pdfData, router])

  if (!pdfData) return null

  const visibleOcgRefs = layers
    .filter((l) => l.visible && l.ocgRef)
    .map((l) => l.ocgRef!)

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <div className="h-screen flex flex-col">
        <nav className="flex items-center justify-between px-6 h-14 border-b border-outline-variant bg-surface flex-shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-primary">Counter-Slice</span>
            <span className="text-sm text-on-surface-variant truncate max-w-xs">{fileName}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDrawingZone(!isDrawingZone)}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors
                ${isDrawingZone
                  ? 'bg-primary text-white border-primary'
                  : 'border-outline-variant text-on-surface hover:bg-surface-container-low'}`}
            >
              <span className="material-symbols-outlined text-base">add_box</span>
              {isDrawingZone ? 'Cancel Zone' : 'Add Zone'}
            </button>
            <Link
              href="/report"
              className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-container transition-colors"
            >
              View Report →
            </Link>
          </div>
        </nav>

        <div className="flex-1 grid grid-cols-[1fr_320px] overflow-hidden">
          <div className="relative overflow-hidden bg-surface-dim/20">
            <PdfViewer
              pdfData={pdfData}
              pageIndex={pageIndex}
              visibleOcgRefs={visibleOcgRefs}
            />
            {isDrawingZone && (
              <ZoneDrawer
                pageIndex={pageIndex}
                onZoneComplete={() => setIsDrawingZone(false)}
              />
            )}
          </div>
          <LayerSidebar />
        </div>

        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-4 py-2 border-t border-outline-variant bg-surface flex-shrink-0">
            <button
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
              className="text-sm px-3 py-1 rounded disabled:opacity-40 hover:bg-surface-container-low"
            >
              ← Prev
            </button>
            <span className="text-sm text-on-surface-variant">Page {pageIndex + 1} of {pageCount}</span>
            <button
              onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
              disabled={pageIndex === pageCount - 1}
              className="text-sm px-3 py-1 rounded disabled:opacity-40 hover:bg-surface-container-low"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 4: Verify editor in browser**

Upload a PDF at http://localhost:3000, confirm it navigates to `/editor` with split layout — PDF canvas on left, layer sidebar on right.

- [ ] **Step 5: Commit**

```bash
git add components/editor/PdfViewer.tsx components/editor/LayerSidebar.tsx app/editor/
git commit -m "feat: add layer editor with PDF viewer and layer sidebar"
```

---

### Task 9: Zone Drawer

**Files:**
- Create: `components/editor/ZoneDrawer.tsx`

**Interfaces:**
- Consumes: `useProjectStore()`, `countObjectsInZone` from `@/lib/pdf/zone-counter`, `getLayerColor` from `@/lib/state/project-store`, `pdfjs` from `@/lib/pdf/pdfjs-setup`
- Produces: SVG drag-to-draw overlay; on mouseup creates a new zone `Layer` in Zustand store

- [ ] **Step 1: Create ZoneDrawer.tsx**

Create `components/editor/ZoneDrawer.tsx`:

```tsx
'use client'

import { useRef, useState, useCallback } from 'react'
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
  const [drawing, setDrawing] = useState<DrawState | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const { pdfData, layers, addLayer } = useProjectStore()

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
      const pdfDoc = await pdfjs.getDocument({ data: pdfData.slice(0) }).promise
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
  }, [drawing, pdfData, pageIndex, addLayer, layers.length, onZoneComplete])

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
```

- [ ] **Step 2: Verify zone drawing in browser**

```bash
npm run dev
```

Upload a PDF → editor → click "Add Zone" → drag rectangle on canvas → verify "Untitled Zone" appears in sidebar with a count, then click its name to rename it.

- [ ] **Step 3: Commit**

```bash
git add components/editor/ZoneDrawer.tsx
git commit -m "feat: add SVG zone drawer for manual count zones"
```

---

### Task 10: Report Preview + Export Page

**Files:**
- Create: `components/report/ReportPreview.tsx`
- Create: `components/report/ExportButtons.tsx`
- Create: `app/report/page.tsx`

**Interfaces:**
- Consumes: `useProjectStore()`, all functions from `@/lib/export/`
- Produces: `/report` route with A4 mock preview + export panel

- [ ] **Step 1: Create ReportPreview.tsx**

Create `components/report/ReportPreview.tsx`:

```tsx
'use client'

import { useProjectStore } from '@/lib/state/project-store'

export function ReportPreview() {
  const { fileName, layers, pageCount } = useProjectStore()
  const totalCount = layers.reduce((sum, l) => sum + l.count, 0)
  const generatedAt = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="bg-white shadow-xl rounded-sm p-10 min-h-[842px] flex flex-col gap-6 max-w-[595px] w-full">
      <div className="flex justify-between items-start border-b-4 border-primary pb-6">
        <div>
          <h2 className="text-xl font-bold text-on-surface uppercase tracking-tight">Layer Analysis Report</h2>
          <p className="text-xs text-on-surface-variant mt-1">{fileName}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-primary text-sm">Counter-Slice</p>
          <p className="text-xs text-on-surface-variant">{generatedAt}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Layers', value: layers.length },
          { label: 'Total Objects', value: totalCount.toLocaleString() },
          { label: 'PDF Pages', value: pageCount },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface-container-low rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary">{stat.value}</p>
            <p className="text-xs text-on-surface-variant mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-base font-semibold text-on-surface border-b border-outline-variant pb-2 mb-3">
          Executive Summary
        </h3>
        <p className="text-sm text-on-surface-variant">
          This report summarizes the PDF layer analysis for <strong>{fileName}</strong>.{' '}
          {layers.length} layer{layers.length !== 1 ? 's' : ''} were detected and analyzed,
          containing a total of {totalCount.toLocaleString()} objects across {pageCount}{' '}
          page{pageCount !== 1 ? 's' : ''}.
        </p>
      </div>

      <div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low">
              {['Layer Name', 'Source', 'Objects'].map((h) => (
                <th key={h} className="py-2 px-3 text-xs uppercase text-on-surface-variant font-bold border-b border-outline-variant">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm">
            {layers.map((layer) => (
              <tr key={layer.id} className="border-b border-outline-variant">
                <td className="py-2 px-3 font-medium">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: layer.color }} />
                    {layer.name}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className="text-xs bg-surface-container px-2 py-0.5 rounded-full text-on-surface-variant">
                    {layer.source === 'ocg' ? 'OCG' : 'Zone'}
                  </span>
                </td>
                <td className="py-2 px-3 font-semibold text-primary text-right">
                  {layer.count.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="py-2 px-3 font-bold text-sm">Total</td>
              <td className="py-2 px-3 text-right font-bold text-primary">{totalCount.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-auto pt-6 text-center border-t border-outline-variant">
        <p className="text-xs text-on-surface-variant">Generated by Counter-Slice — PDF OCG Layer Counter</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create ExportButtons.tsx**

Create `components/report/ExportButtons.tsx`:

```tsx
'use client'

import { useRef, useState } from 'react'
import { useProjectStore } from '@/lib/state/project-store'
import { exportPdfReport } from '@/lib/export/pdf-report'
import { exportCsv } from '@/lib/export/csv-export'
import { exportExcel } from '@/lib/export/excel-export'
import { exportProjectJson, importProjectJson } from '@/lib/export/json-io'

export function ExportButtons() {
  const { fileName, pageCount, layers, setLayers } = useProjectStore()
  const [loading, setLoading] = useState<string | null>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)

  const run = async (key: string, fn: () => Promise<void>) => {
    setLoading(key)
    try { await fn() } finally { setLoading(null) }
  }

  const handleImport = async (file: File) => {
    try {
      const project = await importProjectJson(file)
      setLayers(project.layers)
    } catch {
      alert('Invalid project file.')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => run('pdf', () => exportPdfReport(layers, fileName))}
        disabled={!!loading}
        className="w-full flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-base">download</span>
        {loading === 'pdf' ? 'Generating…' : 'Download PDF Report'}
      </button>

      <button
        onClick={() => run('csv', async () => exportCsv(layers, fileName))}
        disabled={!!loading}
        className="w-full flex items-center gap-2 border border-outline-variant text-on-surface px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-base">table_view</span>
        {loading === 'csv' ? 'Exporting…' : 'Export CSV'}
      </button>

      <button
        onClick={() => run('xlsx', () => exportExcel(layers, fileName))}
        disabled={!!loading}
        className="w-full flex items-center gap-2 border border-outline-variant text-on-surface px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-base">grid_on</span>
        {loading === 'xlsx' ? 'Exporting…' : 'Export Excel'}
      </button>

      <div className="border-t border-outline-variant pt-3 flex gap-2">
        <button
          onClick={() => exportProjectJson({ fileName, pageCount, layers })}
          className="flex-1 flex items-center justify-center gap-1 border border-outline-variant text-on-surface-variant px-3 py-2 rounded-lg text-xs font-medium hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-sm">save</span>
          Save Project
        </button>
        <button
          onClick={() => jsonInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-1 border border-outline-variant text-on-surface-variant px-3 py-2 rounded-lg text-xs font-medium hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-sm">upload_file</span>
          Load Project
        </button>
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f) }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create app/report/page.tsx**

```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useProjectStore } from '@/lib/state/project-store'
import { ReportPreview } from '@/components/report/ReportPreview'
import { ExportButtons } from '@/components/report/ExportButtons'

export default function ReportPage() {
  const router = useRouter()
  const { pdfData, fileName, layers } = useProjectStore()

  useEffect(() => { if (!pdfData) router.push('/') }, [pdfData, router])
  if (!pdfData) return null

  const totalCount = layers.reduce((s, l) => s + l.count, 0)

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 flex items-center justify-between px-8 h-16 bg-surface border-b border-outline-variant">
          <div className="flex items-center gap-4">
            <Link href="/editor" className="flex items-center gap-1 text-primary text-sm font-medium hover:underline">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Back to Editor
            </Link>
            <span className="text-base font-semibold text-on-surface truncate max-w-sm">
              Report: {fileName}
            </span>
          </div>
          <span className="text-sm font-bold text-primary">Counter-Slice</span>
        </nav>

        <main className="max-w-[1440px] mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
          <div className="bg-surface-container-low rounded-xl border border-outline-variant p-6 flex justify-center overflow-auto">
            <ReportPreview />
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-outline-variant p-5">
              <h3 className="text-sm font-semibold text-on-surface mb-4">Summary</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total Layers', value: layers.length },
                  { label: 'Total Objects', value: totalCount.toLocaleString() },
                  { label: 'OCG Layers', value: layers.filter((l) => l.source === 'ocg').length },
                  { label: 'Manual Zones', value: layers.filter((l) => l.source === 'zone').length },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">{label}</span>
                    <span className="font-bold text-on-surface">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-outline-variant p-5">
              <h3 className="text-sm font-semibold text-on-surface mb-4">Export</h3>
              <ExportButtons />
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
```

- [ ] **Step 4: Verify report page end-to-end**

```bash
npm run dev
```

Upload PDF → editor → "View Report →" → verify:
- A4 preview shows layer table
- "Download PDF Report" triggers PDF download
- "Export CSV" triggers CSV download
- "Export Excel" triggers .xlsx download
- "Save Project" triggers JSON download
- "Load Project" accepts a previously saved JSON and updates layer names

- [ ] **Step 5: Commit**

```bash
git add components/report/ app/report/
git commit -m "feat: add report preview and all export buttons"
```

---

### Task 11: Static Export Verification

**Files:**
- No new files — verify existing config produces valid static build

**Interfaces:**
- Produces: `out/` directory with working static site

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests PASS. Exact count: 7 (store) + 3 (ocg-parser) + 4 (object-counter) + 4 (zone-counter) + 3 (json-io) + 1 (csv-export) = **22 tests**.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: Build completes successfully, `out/` directory is created.

- [ ] **Step 3: Serve and verify production build**

```bash
npx serve out -p 3001
```

Open http://localhost:3001 and verify:
1. Upload page loads and dropzone is functional
2. Upload a real PDF with OCG layers — editor opens with layers in sidebar
3. Toggle layer visibility — PDF re-renders showing/hiding layers
4. Add Zone — drag zone on canvas — new "Untitled Zone" layer appears with count
5. Rename a layer by clicking its name
6. Navigate to report — layer table renders correctly
7. Download PDF report — file downloads
8. Export CSV — file downloads with correct layer data
9. Export Excel — .xlsx file downloads
10. Save Project JSON — file downloads
11. Reload page, upload same PDF, Load Project JSON — layer names/zones restore

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "chore: verify static export build passes"
```

---

## Self-Review

**Spec coverage:**
- ✅ PDF upload with OCG extraction → Tasks 3, 7
- ✅ Auto object counting per OCG → Tasks 4, 7
- ✅ Manual zone drawing with count → Tasks 5, 9
- ✅ Layer rename inline → Task 8 (LayerSidebar)
- ✅ Layer toggle visible → Tasks 8 (LayerSidebar), 8 (PdfViewer re-render)
- ✅ PDF report export → Tasks 6, 10
- ✅ CSV export → Tasks 6, 10
- ✅ Excel export → Tasks 6, 10
- ✅ JSON project save/restore → Tasks 6, 10
- ✅ 3-screen flow: Upload → Editor → Report → Tasks 7, 8, 10
- ✅ Design system tokens (primary `#0041c8`, surface `#f8f9ff`, Inter) → Task 1
- ✅ Next.js 14 App Router + static export → Tasks 1, 11
- ✅ pdfjs-dist worker via CDN → Task 7

**Placeholder scan:** None found — every step has complete code.

**Type consistency:**
- `Layer` type: defined Task 2, used consistently in Tasks 3–10 ✅
- `Rect` type: defined Task 2, used in Tasks 5, 9 ✅
- `OcgGroup`: defined Task 3, consumed by Tasks 4, 7 ✅
- `extractOcgGroups(pdfDoc)` → `Promise<OcgGroup[]>`: defined Task 3, used Task 7 ✅
- `countObjectsForAllPages(pdfDoc, ocgGroups)` → `Promise<Record<string,number>>`: defined Task 4, used Task 7 ✅
- `countObjectsInZone(page, normalizedRect)` → `Promise<number>`: defined Task 5, used Task 9 ✅
- `getLayerColor(index)` → `string`: defined Task 2, used Tasks 7, 9 ✅
- `useProjectStore()` actions: `setFile`, `setLayers`, `addLayer`, `updateLayer`, `removeLayer`, `toggleLayerVisible`, `setSelectedLayers`, `reset` — defined Task 2, used Tasks 7–10 ✅
