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
