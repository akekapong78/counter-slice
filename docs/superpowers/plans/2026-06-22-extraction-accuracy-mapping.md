# Extraction Accuracy & Catalog Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix equipment counting accuracy (use text-suffix action instead of color-based action) and add a pre-loaded PEA equipment catalog mapping that the app fetches from `public/equipment-catalog.json`.

**Architecture:** `scanAllItems(doc)` scans every PDF page's raw text once on load, counts equipment codes by their `[IN]`/`[RM]`/`[RP]` suffix, and stores totals in the Zustand store. `ResultsPanel` summary reads from the store instead of re-aggregating from blocks. A static JSON file in `public/` provides default catalog metadata; the user can override Thai names/units; the admin can edit the file without deploying code.

**Tech Stack:** Next.js 14, pdfjs-dist, Zustand, TypeScript, Vitest, xlsx

## Global Constraints

- Path alias `@/` resolves to repo root
- Static export app — no server fetch; `public/` files are served at runtime
- Tests live alongside source as `*.test.ts`; run with `npx vitest run <file>`
- All new `EquipmentName` fields are optional to stay backward-compatible with existing store state
- No new npm dependencies

---

### Task 1: Extend types and store state

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/state/project-store.ts`

**Interfaces:**
- Produces:
  - `EquipmentName` with optional `catalogCode?: string` and `nameEn?: string`
  - `ProjectState.extractItemCounts: Record<string, ItemCounts>`
  - Store action `setExtractItemCounts(counts: Record<string, ItemCounts>): void`

- [ ] **Step 1: Update `lib/types.ts`**

Replace the `EquipmentName` type and add `ItemCounts`. Change only these sections:

```ts
// After TextItem type, add:
export type ItemCounts = { IN: number; RM: number; RP: number }

// Replace EquipmentName:
export type EquipmentName = {
  code: string
  catalogCode?: string   // e.g. "1000010012"
  nameEn?: string        // English catalog description
  nameTh: string
  unit: string
}
```

Also add `extractItemCounts` to `ProjectState`:
```ts
export type ProjectState = {
  fileName: string
  pageCount: number
  pdfData: ArrayBuffer | null
  layers: Layer[]
  selectedLayerIds: string[]
  extractBlocks: ExtractedBlock[]
  colorMappings: ColorMapping[]
  equipmentNames: EquipmentName[]
  extractItemCounts: Record<string, ItemCounts>   // <-- new
}
```

- [ ] **Step 2: Update `lib/state/project-store.ts`**

Add `setExtractItemCounts` to the `Actions` type and implement it:

```ts
// In Actions type, add:
setExtractItemCounts: (counts: Record<string, ItemCounts>) => void
loadCatalog: () => Promise<void>
```

Add to `initialState`:
```ts
extractItemCounts: {} as Record<string, ItemCounts>,
```

Add import at top:
```ts
import type { Layer, ProjectState, ExtractedBlock, ColorMapping, EquipmentName, ItemCounts } from '@/lib/types'
```

Add to `create<ProjectState & Actions>((set, get) => ({`:

> **Note:** Change `(set)` to `(set, get)` in the `create` call.

```ts
setExtractItemCounts: (counts) => set({ extractItemCounts: counts }),

loadCatalog: async () => {
  try {
    const res = await fetch('/equipment-catalog.json')
    if (!res.ok) return
    const catalog: Record<string, Omit<EquipmentName, 'code'>> = await res.json()
    set((state) => {
      const userCodes = new Set(state.equipmentNames.map((n) => n.code))
      const defaults: EquipmentName[] = Object.entries(catalog)
        .filter(([code]) => !userCodes.has(code))
        .map(([code, meta]) => ({ code, ...meta }))
      return { equipmentNames: [...state.equipmentNames, ...defaults] }
    })
  } catch {
    // catalog load is best-effort
  }
},
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/ake/Coding/innovation/counter-slice && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing errors unrelated to these files).

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts lib/state/project-store.ts
git commit -m "feat: extend EquipmentName with catalogCode/nameEn; add extractItemCounts to store"
```

---

### Task 2: Add `scanAllItems()` to text-extractor with tests

**Files:**
- Modify: `lib/pdf/text-extractor.ts`
- Modify: `lib/pdf/text-extractor.test.ts`

**Interfaces:**
- Consumes: internal `collectSegments(page)`, exported `parseItems(text)`
- Produces: `scanAllItems(doc: PDFDocumentProxy): Promise<Record<string, ItemCounts>>`

- [ ] **Step 1: Write the failing test**

Add to `lib/pdf/text-extractor.test.ts` (after the existing `extractTextBlocks` describe block):

```ts
import type { PDFDocumentProxy } from 'pdfjs-dist'

function mockDoc(pages: ReturnType<typeof mockPage>[]): PDFDocumentProxy {
  return {
    numPages: pages.length,
    getPage: async (n: number) => pages[n - 1],
  } as unknown as PDFDocumentProxy
}

describe('scanAllItems', () => {
  it('counts IN items across all pages from text suffix', async () => {
    const page1 = mockPage([
      { fn: SET_FILL_RGB, args: [new Uint8ClampedArray([0, 0, 255])] },
      { fn: SET_TEXT_MATRIX, args: [1, 0, 0, 1, 100, 400] },
      { fn: SHOW_TEXT, args: [glyphArgs('ST-COM(IN)CCB[IN]')] },
    ])
    const page2 = mockPage([
      { fn: SET_FILL_RGB, args: [new Uint8ClampedArray([0, 0, 255])] },
      { fn: SET_TEXT_MATRIX, args: [1, 0, 0, 1, 100, 400] },
      { fn: SHOW_TEXT, args: [glyphArgs('ST-COM(IN)')] },
    ])
    const doc = mockDoc([page1, page2])
    const counts = await scanAllItems(doc)
    expect(counts['ST-COM']).toEqual({ IN: 2, RM: 0, RP: 0 })
    expect(counts['CCB']).toEqual({ IN: 1, RM: 0, RP: 0 })
  })

  it('counts RM items from text suffix regardless of color', async () => {
    const page = mockPage([
      { fn: SET_FILL_RGB, args: [new Uint8ClampedArray([255, 0, 0])] },
      { fn: SET_TEXT_MATRIX, args: [1, 0, 0, 1, 100, 400] },
      { fn: SHOW_TEXT, args: [glyphArgs('12-Y[RM]OHGW[RM]')] },
    ])
    const doc = mockDoc([page])
    const counts = await scanAllItems(doc)
    expect(counts['12-Y']).toEqual({ IN: 0, RM: 1, RP: 0 })
    expect(counts['OHGW']).toEqual({ IN: 0, RM: 1, RP: 0 })
  })

  it('returns empty record when no tagged items exist', async () => {
    const page = mockPage([
      { fn: SET_TEXT_MATRIX, args: [1, 0, 0, 1, 100, 400] },
      { fn: SHOW_TEXT, args: [glyphArgs('แบบเลขที่')] },
    ])
    const doc = mockDoc([page])
    const counts = await scanAllItems(doc)
    expect(counts).toEqual({})
  })
})
```

Also add `scanAllItems` to the import at top of the test file:
```ts
import { parseItems, detectExtractMode, extractTextBlocks, scanAllItems } from './text-extractor'
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx vitest run lib/pdf/text-extractor.test.ts 2>&1 | tail -15
```

Expected: FAIL — `scanAllItems is not exported`

- [ ] **Step 3: Implement `scanAllItems` in `lib/pdf/text-extractor.ts`**

Add the import at top of the file:
```ts
import type { PDFPageProxy, PDFDocumentProxy } from 'pdfjs-dist'
import type { TextItem, RawTextBlock, ItemCounts } from '@/lib/types'
```

Add at end of file (after `extractTextBlocks`):
```ts
export async function scanAllItems(
  doc: PDFDocumentProxy
): Promise<Record<string, ItemCounts>> {
  const counts: Record<string, ItemCounts> = {}
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const segments = await collectSegments(page)
    const text = segments.map((s) => s.text).join('')
    const items = parseItems(text)
    for (const item of items) {
      if (!counts[item.code]) counts[item.code] = { IN: 0, RM: 0, RP: 0 }
      counts[item.code][item.action]++
    }
  }
  return counts
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run lib/pdf/text-extractor.test.ts 2>&1 | tail -15
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/pdf/text-extractor.ts lib/pdf/text-extractor.test.ts
git commit -m "feat: add scanAllItems() for text-suffix-based equipment counting across all pages"
```

---

### Task 3: Create `public/equipment-catalog.json`

**Files:**
- Create: `public/equipment-catalog.json`

**Interfaces:**
- Produces: JSON record consumed by `loadCatalog()` in store
- Format: `Record<drawingCode, { catalogCode, nameEn, nameTh, unit }>`

- [ ] **Step 1: Create the catalog file**

Create `public/equipment-catalog.json`:

```json
{
  "12": {
    "catalogCode": "1000010004",
    "nameEn": "POLE,CONCRETE, 12 M.LONG",
    "nameTh": "เสาคอนกรีต 12 ม.",
    "unit": "ต้น"
  },
  "14": {
    "catalogCode": "1000010006",
    "nameEn": "POLE,CONCRETE, 14 M. LONG",
    "nameTh": "เสาคอนกรีต 14 ม.",
    "unit": "ต้น"
  },
  "12.2": {
    "catalogCode": "1000010012",
    "nameEn": "POLE,CONCRETE, 12.20 M. LONG",
    "nameTh": "เสาคอนกรีต 12.20 ม.",
    "unit": "ต้น"
  },
  "12.2-Y": {
    "catalogCode": "1000010012",
    "nameEn": "POLE,CONCRETE, 12.20 M. LONG (Y-branch)",
    "nameTh": "เสาคอนกรีต 12.20 ม. (แยก Y)",
    "unit": "ต้น"
  },
  "9": {
    "catalogCode": "",
    "nameEn": "POLE (9 M.)",
    "nameTh": "เสา 9 ม.",
    "unit": "ต้น"
  },
  "ST-COM": {
    "catalogCode": "1000110002",
    "nameEn": "CROSSARM,PRESTRESSED CONCRETE,SPUN,H.T. 120X120X3,000 MM.",
    "nameTh": "คอนคอนกรีตอัดแรง",
    "unit": "ชิ้น"
  },
  "DDE": {
    "catalogCode": "1000110004",
    "nameEn": "CROSSARM,PRESTRESSED CONCRETE,SPUN(FOR DEAD-ENDING) 120X120X2,500 MM.",
    "nameTh": "คอน Dead End",
    "unit": "ชิ้น"
  },
  "BA": {
    "catalogCode": "1010010003",
    "nameEn": "STEEL ANGLE,OVERHEAD GROUND WIRE BAYONET 65x65x6 MM. 2,250 MM. LONG",
    "nameTh": "เหล็กฉาก Bayonet OHGW",
    "unit": "ชิ้น"
  },
  "OHGW": {
    "catalogCode": "1010100002",
    "nameEn": "WIRE,STEEL STRANDED 25 sq.mm.TIS.404",
    "nameTh": "สายดินอากาศ (OHGW) 25 ตร.มม.",
    "unit": "ม."
  },
  "GY-32": {
    "catalogCode": "1010100004",
    "nameEn": "WIRE,STEEL STRANDED 50/7 sq.mm.TIS.404",
    "nameTh": "สายเหล็กตีเกลียว 50/7 ตร.มม.",
    "unit": "ม."
  },
  "GY-02": {
    "catalogCode": "1010100006",
    "nameEn": "WIRE,STEEL STRANDED 95 sq.mm.TIS.404",
    "nameTh": "สายเหล็กตีเกลียว 95 ตร.มม.",
    "unit": "ม."
  },
  "SP": {
    "catalogCode": "",
    "nameEn": "GUY WIRE SUPPORT (SP)",
    "nameTh": "อุปกรณ์ยึดโยง SP",
    "unit": "ชุด"
  },
  "CCB": {
    "catalogCode": "1020440100",
    "nameEn": "CLAMP,CABLE SUSPENSION",
    "nameTh": "แคลมป์แขวนสาย",
    "unit": "ชิ้น"
  },
  "DE": {
    "catalogCode": "1020250221",
    "nameEn": "PREFORMED DEAD END,FOR AL PARTIALLY INSULATED CONDUCTOR 33 KV.185 SQ.MM.",
    "nameTh": "Dead End สาย 185 ตร.มม.",
    "unit": "ชุด"
  },
  "LA-2": {
    "catalogCode": "1040000100",
    "nameEn": "S.A. 30 KV. 5 KA.",
    "nameTh": "สายล่อฟ้า 30 kV 5 kA",
    "unit": "ชุด"
  },
  "LA-3": {
    "catalogCode": "1040000100",
    "nameEn": "S.A. 30 KV. 5 KA.",
    "nameTh": "สายล่อฟ้า 30 kV 5 kA",
    "unit": "ชุด"
  },
  "LA-6": {
    "catalogCode": "1040000100",
    "nameEn": "S.A. 30 KV. 5 KA.",
    "nameTh": "สายล่อฟ้า 30 kV 5 kA",
    "unit": "ชุด"
  },
  "MV GR-02": {
    "catalogCode": "30523",
    "nameEn": "HV.GROUNDING GR-2 (ASSEMBLY NO.9706, 9701B)",
    "nameTh": "สายดิน MV GR-02",
    "unit": "ชุด"
  },
  "GR-02": {
    "catalogCode": "30523",
    "nameEn": "HV.GROUNDING GR-2",
    "nameTh": "สายดิน GR-02",
    "unit": "ชุด"
  },
  "TR-202": {
    "catalogCode": "1040080305",
    "nameEn": "TRANSFORMER,0.5 KVA.,1 PHASE 19 KV.FOR POWER SUPPLY OF ELECTRONIC RECLOSER",
    "nameTh": "หม้อแปลง TR-202",
    "unit": "ชุด"
  },
  "R4": {
    "catalogCode": "",
    "nameEn": "RECLOSER / EQUIPMENT R4",
    "nameTh": "อุปกรณ์ R4",
    "unit": "ชุด"
  },
  "R2": {
    "catalogCode": "",
    "nameEn": "RECLOSER / EQUIPMENT R2",
    "nameTh": "อุปกรณ์ R2",
    "unit": "ชุด"
  },
  "R9": {
    "catalogCode": "",
    "nameEn": "RECLOSER / EQUIPMENT R9",
    "nameTh": "อุปกรณ์ R9",
    "unit": "ชุด"
  },
  "D/F": {
    "catalogCode": "",
    "nameEn": "COVER D/F",
    "nameTh": "ฝาครอบ D/F",
    "unit": "ชิ้น"
  },
  "BA.AL": {
    "catalogCode": "",
    "nameEn": "BAYONET ARM ALUMINIUM",
    "nameTh": "Bayonet อะลูมิเนียม",
    "unit": "ชิ้น"
  },
  "FSD-3": {
    "catalogCode": "",
    "nameEn": "FUSE DISCONNECT SWITCH 3-PHASE",
    "nameTh": "สวิตช์ฟิวส์ 3 เฟส",
    "unit": "ชุด"
  },
  "FSD-6": {
    "catalogCode": "",
    "nameEn": "FUSE DISCONNECT SWITCH 6-PHASE",
    "nameTh": "สวิตช์ฟิวส์ 6 เฟส",
    "unit": "ชุด"
  },
  "DE.BL": {
    "catalogCode": "",
    "nameEn": "DEAD END BLOCK",
    "nameTh": "Dead End Block",
    "unit": "ชุด"
  }
}
```

- [ ] **Step 2: Verify JSON is valid**

```bash
python3 -c "import json; json.load(open('public/equipment-catalog.json')); print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add public/equipment-catalog.json
git commit -m "feat: add PEA equipment catalog mapping JSON to public/"
```

---

### Task 4: Wire `scanAllItems` + `loadCatalog` into ExtractViewer and page

**Files:**
- Modify: `components/extract/ExtractViewer.tsx`
- Modify: `app/extract/page.tsx`

**Interfaces:**
- Consumes: `scanAllItems` from `lib/pdf/text-extractor`, `PDFDocumentProxy` from pdfjs-dist
- New prop on ExtractViewer: `onScanComplete?: (counts: Record<string, ItemCounts>) => void`

- [ ] **Step 1: Update `components/extract/ExtractViewer.tsx`**

Add import at top:
```ts
import { scanAllItems } from '@/lib/pdf/text-extractor'
import type { ItemCounts } from '@/lib/types'
```

Add `onScanComplete` to Props type:
```ts
type Props = {
  pdfData: ArrayBuffer
  pageIndex: number
  pageCount: number
  blocks: ExtractedBlock[]
  selectedBlockId: string | null
  onPageChange: (index: number) => void
  onScanComplete?: (counts: Record<string, ItemCounts>) => void  // <-- new
}
```

Update the function signature:
```ts
export function ExtractViewer({ pdfData, pageIndex, pageCount, blocks, selectedBlockId, onPageChange, onScanComplete }: Props) {
```

In the existing `useEffect` that loads the PDF doc (lines 31-45), after `pdfDocRef.current = doc`, add the scan call:

```ts
useEffect(() => {
  pdfjs.getDocument({ data: pdfData.slice(0) }).promise.then((doc) => {
    pdfDocRef.current = doc
    // Auto-fit
    doc.getPage(1).then((page) => {
      const vp = page.getViewport({ scale: 1 })
      if (containerRef.current) {
        const cw = containerRef.current.clientWidth
        const ch = containerRef.current.clientHeight
        const ratio = Math.min(cw / vp.width, ch / vp.height) * 0.95
        setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, ratio)))
        setOffset({ x: 0, y: 0 })
      }
    })
    // Scan all pages for equipment counts
    if (onScanComplete) {
      scanAllItems(doc).then(onScanComplete)
    }
  })
}, [pdfData, onScanComplete])
```

- [ ] **Step 2: Update `app/extract/page.tsx`**

Add to the store destructure:
```ts
const { pdfData, fileName, pageCount, extractBlocks, setExtractItemCounts, loadCatalog } = useProjectStore()
```

Add a `useEffect` to load catalog on mount (after the existing `setupPdfWorker` effect):
```ts
useEffect(() => { void loadCatalog() }, [loadCatalog])
```

Pass `onScanComplete` to `ExtractViewer`:
```tsx
<ExtractViewer
  pdfData={pdfData}
  pageIndex={pageIndex}
  pageCount={pageCount}
  blocks={extractBlocks}
  selectedBlockId={selectedBlockId}
  onPageChange={setPageIndex}
  onScanComplete={setExtractItemCounts}
/>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 4: Run all tests**

```bash
npx vitest run 2>&1 | tail -10
```

Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add components/extract/ExtractViewer.tsx app/extract/page.tsx
git commit -m "feat: scan all pages for item counts on PDF load; load catalog JSON on extract page mount"
```

---

### Task 5: Update `EquipmentNamesTable` — show catalogCode/nameEn readonly

**Files:**
- Modify: `components/extract/EquipmentNamesTable.tsx`

**Interfaces:**
- Consumes: `EquipmentName.catalogCode`, `EquipmentName.nameEn` (added in Task 1)

- [ ] **Step 1: Replace `components/extract/EquipmentNamesTable.tsx`**

```tsx
'use client'

import { useProjectStore } from '@/lib/state/project-store'

export function EquipmentNamesTable() {
  const { equipmentNames, extractBlocks, upsertEquipmentName } = useProjectStore()

  const allCodes = Array.from(
    new Set(extractBlocks.flatMap((b) => b.items.map((i) => i.code)))
  ).sort()

  const nameMap = new Map(equipmentNames.map((n) => [n.code, n]))
  const rows = allCodes.map((code) => nameMap.get(code) ?? { code, catalogCode: '', nameEn: '', nameTh: '', unit: '' })

  if (rows.length === 0) return null

  return (
    <div className="p-3">
      <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Equipment Names</h3>
      <div className="overflow-auto max-h-48">
        <table className="text-xs w-full">
          <thead>
            <tr className="text-on-surface-variant border-b border-outline-variant">
              <th className="text-left py-1 pr-2">Code</th>
              <th className="text-left py-1 pr-2">Cat.Code</th>
              <th className="text-left py-1 pr-2">English Name</th>
              <th className="text-left py-1 pr-2">Thai Name</th>
              <th className="text-left py-1">Unit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code} className={`border-b border-outline-variant/40 ${!row.nameTh ? 'bg-yellow-50' : ''}`}>
                <td className="py-1 pr-2 font-mono text-on-surface">{row.code}</td>
                <td className="py-1 pr-2 font-mono text-on-surface-variant text-[10px]">{row.catalogCode ?? ''}</td>
                <td className="py-1 pr-2 text-on-surface-variant text-[10px] max-w-[120px] truncate" title={row.nameEn ?? ''}>{row.nameEn ?? ''}</td>
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
                    className="w-16 bg-transparent border-b border-outline-variant/50 focus:border-primary outline-none text-xs"
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

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/extract/EquipmentNamesTable.tsx
git commit -m "feat: show catalogCode and nameEn readonly columns in EquipmentNamesTable"
```

---

### Task 6: Update `ResultsPanel` — summary uses `extractItemCounts` from store

**Files:**
- Modify: `components/extract/ResultsPanel.tsx`

**Interfaces:**
- Consumes: `store.extractItemCounts` (Record<string, ItemCounts>) from Task 1
- Consumes: `store.equipmentNames` (EquipmentName with catalogCode/nameEn) from Task 1

- [ ] **Step 1: Update the summary section in `ResultsPanel.tsx`**

In the store destructure at top of `ResultsPanel`, add `extractItemCounts`:
```ts
const { extractBlocks, equipmentNames, colorMappings, extractItemCounts } = useProjectStore()
```

Replace the `summary` useMemo (lines 57-67) with one that reads from `extractItemCounts`:
```ts
const summary = useMemo(() => {
  return Object.entries(extractItemCounts)
    .sort(([a], [b]) => a.localeCompare(b))
}, [extractItemCounts])
```

In the summary tab JSX, the table header needs a `Cat.Code` and `English Name` column added before `Thai Name`. Replace the header row:
```tsx
{['Code', 'Cat.Code', 'English Name', 'Thai Name', 'Unit', 'RM', 'IN', 'RP'].map((h) => (
  <th key={h} className="text-left px-3 py-2 text-on-surface-variant">{h}</th>
))}
```

Replace the summary table body rows (inside `summary.map`):
```tsx
{summary.map(([code, counts]) => {
  const entry = nameMap.get(code)
  return (
    <tr key={code} className="border-b border-outline-variant/40 hover:bg-surface-container-low">
      <td className="px-3 py-1.5 font-mono">{code}</td>
      <td className="px-3 py-1.5 font-mono text-[10px] text-on-surface-variant">{entry?.catalogCode ?? ''}</td>
      <td className="px-3 py-1.5 text-[10px] text-on-surface-variant max-w-[140px] truncate" title={entry?.nameEn ?? ''}>{entry?.nameEn ?? ''}</td>
      <td className="px-3 py-1.5 text-on-surface-variant">{entry?.nameTh ?? ''}</td>
      <td className="px-3 py-1.5 text-on-surface-variant">{entry?.unit ?? ''}</td>
      <td className="px-3 py-1.5 text-red-600 font-medium">{counts.RM || ''}</td>
      <td className="px-3 py-1.5 text-blue-600 font-medium">{counts.IN || ''}</td>
      <td className="px-3 py-1.5 text-yellow-600 font-medium">{counts.RP || ''}</td>
    </tr>
  )
})}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add components/extract/ResultsPanel.tsx
git commit -m "feat: summary tab uses scanAllItems counts from store; add catalogCode/nameEn columns"
```

---

### Task 7: Update CSV and Excel exports

**Files:**
- Modify: `lib/export/extract-csv-export.ts`
- Modify: `lib/export/extract-csv-export.test.ts`
- Modify: `lib/export/extract-excel-export.ts`

**Interfaces:**
- Consumes: `EquipmentName.catalogCode`, `EquipmentName.nameEn`
- Consumes: `ItemCounts` type and `extractItemCounts` record for summary export
- New export function signature: `exportExtractCsvSummary(counts: Record<string, ItemCounts>, names: EquipmentName[]): string`

- [ ] **Step 1: Write failing tests for updated CSV summary**

In `lib/export/extract-csv-export.test.ts`, add (or replace existing summary test):

```ts
import { describe, it, expect } from 'vitest'
import { exportExtractCsvDetail, exportExtractCsvSummary } from './extract-csv-export'
import type { ExtractedBlock, EquipmentName, ItemCounts } from '@/lib/types'

describe('exportExtractCsvSummary', () => {
  it('includes catalogCode and nameEn in summary CSV', () => {
    const counts: Record<string, ItemCounts> = {
      'ST-COM': { IN: 3, RM: 1, RP: 0 },
      'CCB':    { IN: 5, RM: 0, RP: 0 },
    }
    const names: EquipmentName[] = [
      { code: 'ST-COM', catalogCode: '1000110002', nameEn: 'CROSSARM,PRESTRESSED CONCRETE', nameTh: 'คอนคอนกรีต', unit: 'ชิ้น' },
    ]
    const csv = exportExtractCsvSummary(counts, names)
    expect(csv).toContain('catalogCode')
    expect(csv).toContain('1000110002')
    expect(csv).toContain('CROSSARM,PRESTRESSED CONCRETE')
    expect(csv).toContain('3')  // IN count for ST-COM
  })
})
```

Run to confirm failure:
```bash
npx vitest run lib/export/extract-csv-export.test.ts 2>&1 | tail -10
```

- [ ] **Step 2: Update `lib/export/extract-csv-export.ts`**

Replace the entire file:

```ts
import type { ExtractedBlock, EquipmentName, ItemCounts } from '@/lib/types'

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
  const lines = ['page,poleId,action,code,catalogCode,nameEn,nameTh,unit']
  for (const block of blocks) {
    for (const item of block.items) {
      const entry = lookup.get(item.code)
      lines.push(row([
        String(block.pageIndex + 1),
        block.poleId ?? '',
        block.action,
        item.code,
        entry?.catalogCode ?? '',
        entry?.nameEn ?? '',
        entry?.nameTh ?? '',
        entry?.unit ?? '',
      ]))
    }
  }
  return lines.join('\n')
}

export function exportExtractCsvSummary(
  counts: Record<string, ItemCounts>,
  names: EquipmentName[]
): string {
  const lookup = nameMap(names)
  const lines = ['code,catalogCode,nameEn,nameTh,unit,RM,IN,RP']
  for (const [code, c] of Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))) {
    const entry = lookup.get(code)
    lines.push(row([
      code,
      entry?.catalogCode ?? '',
      entry?.nameEn ?? '',
      entry?.nameTh ?? '',
      entry?.unit ?? '',
      String(c.RM),
      String(c.IN),
      String(c.RP),
    ]))
  }
  return lines.join('\n')
}
```

- [ ] **Step 3: Run tests to confirm they pass**

```bash
npx vitest run lib/export/extract-csv-export.test.ts 2>&1 | tail -10
```

Expected: PASS

- [ ] **Step 4: Update `ResultsPanel.tsx` export button calls**

In `ResultsPanel.tsx`, the Summary CSV export button calls `exportExtractCsvSummary`. Update the call to pass `extractItemCounts` instead of `resolvedBlocks`:

```tsx
<button
  onClick={() => downloadCsv(exportExtractCsvSummary(extractItemCounts, equipmentNames), `${fileName}-summary.csv`)}
  className="flex-1 text-xs bg-surface border border-outline-variant rounded py-1.5 hover:bg-surface-container-low"
>Summary CSV</button>
```

Also update the Excel export — `extract-excel-export.ts` currently delegates to CSV functions. Update `lib/export/extract-excel-export.ts`:

```ts
import * as XLSX from 'xlsx'
import type { ExtractedBlock, EquipmentName, ItemCounts } from '@/lib/types'
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
  counts: Record<string, ItemCounts>,
  fileName: string
): void {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, csvToSheet(exportExtractCsvDetail(blocks, names)), 'Detail')
  XLSX.utils.book_append_sheet(wb, csvToSheet(exportExtractCsvSummary(counts, names)), 'Summary')
  XLSX.writeFile(wb, `${fileName}-extract.xlsx`)
}
```

Update the Excel button in `ResultsPanel.tsx`:
```tsx
<button
  onClick={() => exportExtractExcel(resolvedBlocks, equipmentNames, extractItemCounts, fileName)}
  className="flex-1 text-xs bg-primary text-white rounded py-1.5 hover:bg-primary-container"
>Excel</button>
```

- [ ] **Step 5: Run full test suite**

```bash
npx vitest run 2>&1 | tail -15
```

Expected: all PASS

- [ ] **Step 6: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/export/extract-csv-export.ts lib/export/extract-csv-export.test.ts lib/export/extract-excel-export.ts components/extract/ResultsPanel.tsx
git commit -m "feat: update CSV/Excel exports to include catalogCode, nameEn; summary uses scanAllItems counts"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 3 components from spec covered — text-suffix counting (Tasks 2,4,6), catalog JSON (Task 3), type+UI+export updates (Tasks 1,5,7)
- [x] **No placeholders:** All steps have complete code
- [x] **Type consistency:** `ItemCounts` defined in Task 1 (types.ts), used in Tasks 2,4,6,7. `EquipmentName.catalogCode`/`nameEn` defined Task 1, consumed Tasks 5,6,7. `exportExtractCsvSummary` signature updated in Task 7 and called in Task 7's ResultsPanel step.
- [x] **Backward compat:** `catalogCode` and `nameEn` are optional — existing store state without them still works
