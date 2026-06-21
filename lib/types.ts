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
