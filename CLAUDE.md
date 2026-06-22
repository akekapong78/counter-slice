# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Next.js dev server
npm run build        # Production static export (outputs to out/)
npm run test         # Run all tests once (Vitest)
npm run test:watch   # Vitest watch mode
npm run test:coverage
npm run lint
```

Run a single test file:
```bash
npx vitest run lib/pdf/ocg-parser.test.ts
```

## Architecture

**Browser-only Next.js 14 app** with static export (`output: 'export'`). No server-side logic — everything runs in the browser.

### Three-screen flow

`/` → Upload → `/editor` → Layer Editor → `/report` → Export

State persists between screens via a single Zustand store (`lib/state/project-store.ts`). `pdfData` is stored as `ArrayBuffer` in the store; never re-fetched.

### Key design decisions

**Coordinate system**: Zone rects are stored as normalized 0–1 fractions of the page dimensions (not pixels). `ZoneDrawer` converts mouse positions to fractions; `zone-counter.ts` converts back when hitting the PDF operator list. PDF y-axis is bottom-up — `pointInRect` flips it: `ny = 1 - py/vh`.

**PDF.js setup**: Worker is loaded from CDN (`pdfjs-setup.ts`). Must call `setupPdfWorker()` before any PDF operations. In `ZoneDrawer`, `PDFDocumentProxy` is cached in a `useRef` (loaded once on `pdfData` change) to avoid re-parsing on every zone draw.

**Object counting**: `zone-counter.ts` walks the raw PDF operator list (`page.getOperatorList()`). It tracks the last `moveTo`/`lineTo`/`setTextMatrix` position and increments when a paint op lands inside the zone rect. This is a heuristic — it counts distinct paint operations, not semantic objects.

**OCG layers**: `ocg-parser.ts` reads Optional Content Groups via `pdfDoc.getOptionalContentConfig()`. OCG layers and manually drawn zones both become `Layer` objects with `source: 'ocg' | 'zone'`.

### Layer type

```ts
type Layer = {
  id: string
  name: string
  source: 'ocg' | 'zone'
  ocgRef?: string        // only for ocg layers
  zoneRect?: Rect        // only for zone layers (normalized 0–1)
  zonePageIndex?: number
  count: number
  visible: boolean
  color: string          // auto-assigned from LAYER_COLORS palette
}
```

### Export modules (`lib/export/`)

| File | Output | Notes |
|------|--------|-------|
| `csv-export.ts` | CSV string | RFC 4180 quote escaping required |
| `excel-export.ts` | XLSX blob | Uses `xlsx` library |
| `json-io.ts` | JSON string | Also handles import/parse |
| `pdf-report.ts` | PDF blob | Uses `jspdf` + `jspdf-autotable` |

### Testing

Vitest with jsdom. Tests live alongside source as `*.test.ts`. PDF-dependent tests mock `pdfjs-dist`. Path alias `@/` resolves to repo root.
