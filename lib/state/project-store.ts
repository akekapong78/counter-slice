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
