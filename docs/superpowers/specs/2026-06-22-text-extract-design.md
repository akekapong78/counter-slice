# Text-Based Equipment Extraction — Design Spec
Date: 2026-06-22

## Problem

PDF electrical drawings (PEA standard) encode equipment work orders as colored text blocks — no OCG layers. Each pole has a text box listing equipment codes tagged `[RM]`/`(RM)` (remove) or `[IN]`/`(IN)` (install) or `(RP)` (replace). Text color is the primary semantic signal (red=RM, blue=IN by convention), but varies by designer. The app needs to extract, classify, and aggregate these equipment lists without OCG layers or zone drawing.

---

## Flow

```
Upload PDF
    ↓
auto-detect(): scan page 1 text+color for RM/IN tags
    ├─ tags found → redirect /extract  (new flow)
    └─ tags not found → redirect /editor (zone mode, unchanged)
```

---

## Section 1: Text Block Clustering (`lib/pdf/text-extractor.ts`)

Walk pdfjs operator list per page, tracking simultaneously:
1. **fill color** (op fn=58, `Uint8ClampedArray [r,g,b]`)
2. **position** (setTextMatrix → args[4]=X, args[5]=Y)
3. **text** (showText/showSpacedText → unicode glyphs)

**Clustering algorithm:**
- Group glyphs into blocks by X/Y proximity (configurable threshold, default ±20px in PDF units)
- Each block stores `{ rawText, color, bbox, pageIndex }`

**Item parsing within each block:**
- Regex: `/([A-Z0-9\-\.]+)(?:\[([A-Z]+)\]|\(([A-Z]+)\))/g`
- Extracts `{ code: string, action: 'RM'|'IN'|'RP' }[]`

**Pole ID detection:**
- Scan nearby blocks (same page, Y within ±30px) for pattern `P\d+`
- Assign as `poleId` on the block

**Output type:**
```ts
type ExtractedBlock = {
  poleId: string | null
  pageIndex: number
  bbox: Rect              // normalized 0–1, for highlight overlay
  color: [number, number, number]
  action: 'RM' | 'IN' | 'RP' | 'unknown'  // resolved via color mapping
  items: { code: string; action: 'RM' | 'IN' | 'RP' }[]
}
```

---

## Section 2: Color Mapping (`lib/pdf/color-classifier.ts`)

**Auto-guess logic (runs once after extraction):**
- R dominant (R > 200, G < 50, B < 50) → `RM`
- B dominant (B > 150, R < 50) → `IN`
- Otherwise → `unknown`

**Store type:**
```ts
type ColorMapping = {
  rgb: [number, number, number]
  label: 'RM' | 'IN' | 'RP' | 'ignore'
  hex: string  // for display
}
```

**Re-classification:** updating a `ColorMapping` triggers re-resolve of all `ExtractedBlock.action` without re-parsing the PDF — pure store computation.

---

## Section 3: Equipment Name Lookup

**Store type:**
```ts
type EquipmentName = {
  code: string    // e.g. "12-Y", "OHGW", "CCB"
  nameTh: string  // e.g. "เสาคอนกรีต 12 เมตร"
  unit: string    // e.g. "ต้น", "เมตร", "ชุด"
}
```

- Auto-populated with all unique codes found during extraction (nameTh/unit empty initially)
- Unknown codes (no nameTh) highlighted yellow in UI
- Editable table in sidebar panel
- Import/export as JSON

---

## Section 4: PDF Viewer with Pan/Zoom/Highlight (`components/extract/ExtractViewer.tsx`)

**Rendering:** pdfjs → `<canvas>` (same pattern as existing `PdfViewer`)

**Pan/zoom controls:**
- Toolbar: zoom in, zoom out, fit page, fit width buttons
- Mouse wheel → zoom (adjust `scale` state, re-render canvas)
- Click+drag → pan (translate wrapper div via `transform`)

**Highlight overlay:** `<svg>` absolutely positioned over canvas
- On block selection: draw `<rect>` at `bbox` (normalized → pixel = bbox * canvas size)
- Color: red fill for RM, blue fill for IN, yellow for RP — all at 20% opacity + colored stroke
- Animation: CSS flash on mount
- Auto-scroll: selected block scrolls into view; auto-switches page if needed

**Page navigation:** page selector bar (same as existing editor)

---

## Section 5: `/extract` Page Layout

```
┌──────────────────────────┬─────────────────────────┐
│   ExtractViewer          │  Color Mapping Panel     │
│   (pan/zoom canvas)      │  (color swatches+labels) │
│   SVG highlight overlay  ├─────────────────────────┤
│                          │  Equipment Names Table   │
│                          │  (editable, import/exp.) │
│                          ├─────────────────────────┤
│                          │  Results                 │
│                          │  [RM/IN/RP/All] [search] │
│                          │  ┌─Per-Pole Detail──────┐│
│                          │  │ P351 [RM] 12-Y, OHGW ││
│                          │  │ P352 [IN] DDE, GY-32 ││  ← click → highlight
│                          │  └──────────────────────┘│
│                          │  ┌─Summary───────────────┐│
│                          │  │ Code   RM  IN  RP     ││
│                          │  │ 12-Y    8   3   0     ││
│                          │  └──────────────────────┘│
│                          │  [Export CSV] [Export Excel]│
└──────────────────────────┴─────────────────────────┘
```

---

## Section 6: State (Zustand store extension)

Extend `lib/state/project-store.ts` with new slice:

```ts
// New state fields
extractBlocks: ExtractedBlock[]
colorMappings: ColorMapping[]
equipmentNames: EquipmentName[]

// New actions
setExtractBlocks: (blocks: ExtractedBlock[]) => void
upsertColorMapping: (mapping: ColorMapping) => void
upsertEquipmentName: (name: EquipmentName) => void

// Derived (computed in selector, not stored)
// resolvedBlocks = extractBlocks with action resolved via colorMappings
// summary = aggregate count per code per action
```

---

## Section 7: Export (`lib/export/`)

**CSV** (`extract-csv-export.ts`):
- File 1 (detail): columns `page, poleId, action, code, nameTh, unit`
- File 2 (summary): columns `code, nameTh, unit, RM_count, IN_count, RP_count`
- RFC 4180 quote escaping (same pattern as existing `csv-export.ts`)

**Excel** (`extract-excel-export.ts`):
- Single `.xlsx` with 2 sheets: "Detail" + "Summary"
- Uses `xlsx` library (already a dependency)

---

## New Files

```
lib/pdf/text-extractor.ts        ← block clustering + item parsing
lib/pdf/color-classifier.ts      ← auto-guess + color→action resolution
lib/export/extract-csv-export.ts ← detail + summary CSV
lib/export/extract-excel-export.ts ← 2-sheet Excel
components/extract/ExtractViewer.tsx  ← pan/zoom PDF + SVG highlight
components/extract/ColorMappingPanel.tsx
components/extract/EquipmentNamesTable.tsx
components/extract/ResultsPanel.tsx
app/extract/page.tsx
```

## Modified Files

```
app/page.tsx                  ← add auto-detect after upload, redirect /extract
lib/state/project-store.ts    ← add extract slice
```

---

## Out of Scope

- OCR for scanned PDFs (this targets vector text only)
- Auto-detection of pole IDs from non-standard patterns
- Editing or correcting parsed data inline (read-only results)
