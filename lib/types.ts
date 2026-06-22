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
  extractBlocks: ExtractedBlock[]
  colorMappings: ColorMapping[]
  equipmentNames: EquipmentName[]
  extractItemCounts: Record<string, ItemCounts>
}

// --- Extract feature types ---

export type ItemCounts = { IN: number; RM: number; RP: number }

export type TextItem = {
  code: string
  action: 'RM' | 'IN' | 'RP'
}

export type RawTextBlock = {
  rawText: string
  x: number        // PDF units, left edge (not normalized)
  y: number        // PDF units, baseline (not normalized)
  width: number    // PDF units, span of block
  height: number   // PDF units, span of block
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
  catalogCode?: string
  nameEn?: string
  nameTh: string
  unit: string
}
