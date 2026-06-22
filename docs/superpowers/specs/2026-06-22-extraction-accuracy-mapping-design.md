# Equipment Extraction Accuracy & Catalog Mapping

**Date:** 2026-06-22
**Status:** Approved

## Problem

1. **Counting inaccuracy** — `clusterIntoBlocks` groups segments by Y proximity only; vertically-stacked labels from adjacent poles can merge, causing miscounts. Color-based action (`block.action`) used for summary is less reliable than the explicit text suffix.

2. **Missing catalog mapping** — `EquipmentName` has only `code`, `nameTh`, `unit`. The expected output (result PDF) requires `รหัสพัสดุ` (catalog code) and English description for each drawing shorthand code.

3. **No default mapping** — every user must type all equipment names manually from scratch.

## Solution

### Component 1: Text-suffix counting (Approach B)

Replace color-based counting with direct text-scan counting.

**New function** `scanAllItems(pages: PDFPageProxy[]): Promise<Map<string, ItemCounts>>`
- Collect ALL segments from all pages via `collectSegments()` (no clustering)
- Run `parseItems()` on concatenated text per page
- Return `Map<drawingCode, { IN: number, RM: number, RP: number }>`

**ResultsPanel summary tab** uses `scanAllItems()` result instead of aggregating from `resolvedBlocks`.

This eliminates clustering accuracy as a counting concern. Spatial blocks (ExtractedBlocks) are retained for PDF viewer highlighting only.

### Component 2: Equipment catalog JSON

**`public/equipment-catalog.json`** — admin-editable without code change:
```json
{
  "ST-COM": {
    "catalogCode": "1000110002",
    "nameEn": "CROSSARM,PRESTRESSED CONCRETE,SPUN,H.T. 120X120X3,000 MM.",
    "nameTh": "คอนคอนกรีตอัดแรง",
    "unit": "ชุด"
  },
  "12.2": {
    "catalogCode": "1000010012",
    "nameEn": "POLE,CONCRETE, 12.20 M. LONG",
    "nameTh": "เสาคอนกรีต 12.20 ม.",
    "unit": "ต้น"
  }
}
```

**Load on app startup**: `useProjectStore` fetches `/equipment-catalog.json` once on first load, merges into `equipmentNames` only for codes not already user-overridden.

**EquipmentName type** gains two optional fields:
```ts
type EquipmentName = {
  code: string
  catalogCode?: string   // e.g. "1000010012"
  nameEn?: string        // English catalog description
  nameTh: string
  unit: string
}
```

### Component 3: EquipmentNamesTable UI update

- Show `catalogCode` and `nameEn` columns (readonly, sourced from JSON)
- User still edits `nameTh` and `unit`
- Highlight rows with no catalog match (no JSON entry found)

### Component 4: Export update

Summary CSV and Excel add columns in this order:
`catalogCode | nameEn | nameTh | unit | IN | RM | RP`

## Data Flow

```
PDF upload
  → extractTextBlocks() → ExtractedBlocks (for UI only)
  → scanAllItems()      → counts Map (for summary tab)

App startup
  → fetch /equipment-catalog.json
  → merge into store.equipmentNames (no overwrite of user edits)

ResultsPanel summary
  → combine counts Map + equipmentNames
  → render table + export
```

## Files Changed

| File | Change |
|------|--------|
| `lib/types.ts` | Add `catalogCode?`, `nameEn?` to `EquipmentName` |
| `lib/pdf/text-extractor.ts` | Add `scanAllItems()` export |
| `lib/state/project-store.ts` | Load catalog JSON on startup, add `loadCatalog()` action |
| `public/equipment-catalog.json` | New — initial PEA drawing code mapping |
| `components/extract/EquipmentNamesTable.tsx` | Add catalogCode/nameEn readonly columns |
| `components/extract/ResultsPanel.tsx` | Summary uses scanAllItems counts |
| `lib/export/extract-csv-export.ts` | Add catalogCode, nameEn columns |
| `lib/export/extract-excel-export.ts` | Add catalogCode, nameEn columns |

## Out of Scope

- Auto-detection of catalog codes from PDF text
- Full Thai name translations (user fills these)
- Pole-level detail in summary (total count per code is sufficient)
