# Counter-Slice Design Spec
**Date:** 2026-06-21  
**App:** Counter-Slice — PDF OCG Layer Counter  
**Stack:** Next.js 14 App Router, static export, pdfjs-dist, Zustand, jsPDF, SheetJS

---

## 1. Overview

Counter-Slice is a browser-only web app that uploads a PDF, extracts its Optional Content Groups (OCG layers), counts graphic objects per layer automatically, and lets users draw manual count zones as fallback. The result is exported as a PDF report, CSV, or Excel file.

No backend. No login. All processing runs client-side.

---

## 2. Architecture

### Directory Structure

```
counter-slice/
├── app/
│   ├── page.tsx                  ← Upload screen
│   ├── editor/page.tsx           ← Layer Editor (split view)
│   └── report/page.tsx           ← Report Preview
├── components/
│   ├── upload/
│   │   └── Dropzone.tsx
│   ├── editor/
│   │   ├── PdfViewer.tsx         ← pdfjs-dist canvas render
│   │   ├── ZoneDrawer.tsx        ← SVG overlay for drag-to-draw zones
│   │   └── LayerSidebar.tsx      ← toggle, rename, count display
│   └── report/
│       ├── ReportPreview.tsx
│       └── ExportButtons.tsx
├── lib/
│   ├── pdf/
│   │   ├── ocg-parser.ts         ← extract OCG groups via pdfjs-dist
│   │   ├── object-counter.ts     ← count objects per OCG via operator list
│   │   └── zone-counter.ts       ← count objects within user-drawn rect
│   ├── export/
│   │   ├── pdf-report.ts         ← jsPDF + jspdf-autotable
│   │   ├── csv-export.ts         ← native string
│   │   └── excel-export.ts       ← SheetJS xlsx
│   └── state/
│       ├── project-store.ts      ← Zustand store
│       └── json-io.ts            ← project JSON export/import
└── next.config.ts                ← output: 'export', webpack worker config
```

### State Flow

```
Upload PDF → ocg-parser → Zustand store → Editor mutates → Report reads → Export
```

---

## 3. Data Model

```typescript
type Layer = {
  id: string
  name: string              // user-editable, defaults to OCG name or "Untitled Zone"
  source: 'ocg' | 'zone'
  ocgRef?: string           // OCG group id (source='ocg')
  zoneRect?: Rect           // normalized 0–1 coords (source='zone')
  count: number
  visible: boolean
  color: string             // UI indicator color
}

type Rect = { x: number; y: number; width: number; height: number }

type ProjectState = {
  fileName: string
  pageCount: number
  pdfData: ArrayBuffer      // raw bytes — NOT serialized to JSON
  layers: Layer[]
  selectedLayerIds: string[]
}
```

---

## 4. PDF OCG + Counting Logic

### OCG Extraction (`ocg-parser.ts`)

Use `PDFDocumentProxy.getOptionalContentConfig()` from pdfjs-dist to get all OCG groups. Each group provides `id`, `name`, and `defaultVisible`.

### Object Counting (`object-counter.ts`)

Use `PDFPageProxy.getOperatorList()` to get the content stream as operator arrays. Walk operators looking for `OPS.beginMarkedContentProps` with tag `/OC` matching an OCG ref → count path/image/text operators until `endMarkedContent`. Sum across all pages.

### Zone Counter (`zone-counter.ts`) — fallback

User draws a rectangle on the canvas overlay (normalized 0–1 coordinates). Convert to PDF user space. Filter objects from the operator list whose bounding boxes intersect the zone rect. Count them.

---

## 5. UI Flow

### Route: `/` — Upload

- Drag-drop or click to upload PDF
- `FileReader` reads as `ArrayBuffer`
- `ocg-parser` extracts layers → populate Zustand store
- `router.push('/editor')`

### Route: `/editor` — Layer Editor

**Left panel (60%):**
- pdfjs canvas renders current page
- SVG ZoneDrawer overlay — drag to draw rectangle zone
- On zone drop: create new Layer with `source='zone'`, `name='Untitled Zone'`
- Page navigation controls

**Right sidebar (40%):**
- Layer list: toggle visibility, inline rename, count badge
- "Add Zone" button → enters draw mode
- Selected Layers Summary table (live aggregate, bottom)

### Route: `/report` — Report Preview

- A4 mock preview with layer table + summary stats
- Export buttons: Download PDF, Export CSV, Export Excel
- JSON export/import buttons (project state without pdfData)
- "Back to Editor" link

---

## 6. Export

| Format | Library | Notes |
|--------|---------|-------|
| PDF Report | jsPDF + jspdf-autotable | A4, layer table, summary stats |
| CSV | native | `layer_name, count, source` |
| Excel | SheetJS (xlsx) | `.xlsx`, single sheet |
| Project JSON | JSON.stringify | layers + metadata only, no pdfData |
| Project JSON import | FileReader + JSON.parse | user must re-upload same PDF |

> JSON import merges saved layer names/zones into the freshly uploaded PDF's operator data.

---

## 7. Design System

Source: `design_by_stitch/precision_analytical_system/DESIGN.md`

- **Font:** Inter
- **Primary:** `#0041c8` (Action Blue)
- **Surface:** `#f8f9ff`
- **On-surface:** `#0b1c30`
- **Border radius:** 8px base, 16px cards
- **Spacing:** 8px scale
- **Max width:** 1440px

Reference HTML screens already exist in `design_by_stitch/`:
- `doclayer_ai_upload_pdf/code.html`
- `doclayer_ai_report_preview/code.html`
- `doclayer_ai_layer_editor/screen.png` (PNG only, no HTML)

---

## 8. Key Decisions

- **No backend** — all PDF parsing and counting runs in browser via pdfjs-dist Web Worker
- **pdfData not serialized** — JSON export saves layer metadata only; user re-uploads PDF on import
- **Zustand** for state — simple, no boilerplate, works cleanly with Next.js client components
- **Static export** (`output: 'export'`) — deployable to Vercel, GitHub Pages, or any CDN with no server
- **pdfjs worker** — configure via webpack alias in `next.config.ts` to avoid bundling issues
