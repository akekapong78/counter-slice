import { create } from 'zustand'
import type { Layer, ProjectState, ExtractedBlock, ColorMapping, EquipmentName, ItemCounts } from '@/lib/types'

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
  setExtractBlocks: (blocks: ExtractedBlock[]) => void
  upsertColorMapping: (mapping: ColorMapping) => void
  upsertEquipmentName: (name: EquipmentName) => void
  setExtractItemCounts: (counts: Record<string, ItemCounts>) => void
  loadCatalog: () => Promise<void>
}

const initialState: ProjectState = {
  fileName: '',
  pageCount: 0,
  pdfData: null,
  layers: [],
  selectedLayerIds: [],
  extractBlocks: [] as ExtractedBlock[],
  colorMappings: [] as ColorMapping[],
  equipmentNames: [] as EquipmentName[],
  extractItemCounts: {} as Record<string, ItemCounts>,
}

export const useProjectStore = create<ProjectState & Actions>((set, get) => ({
  ...initialState,

  setFile: (fileName, pageCount, pdfData) =>
    set({ fileName, pageCount, pdfData, layers: [], selectedLayerIds: [], extractBlocks: [], colorMappings: [], extractItemCounts: {} }),

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
}))

export function getLayerColor(index: number): string {
  return LAYER_COLORS[index % LAYER_COLORS.length]
}
